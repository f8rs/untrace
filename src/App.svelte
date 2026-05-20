<script>
  import { onMount } from "svelte";
  import ImageUploader from "./lib/ImageUploader.svelte";
  import ThemeToggle from "./lib/ThemeToggle.svelte";
  import Header from "./lib/Header.svelte";
  import Footer from "./lib/Footer.svelte";
  import PrivacyInfo from "./lib/PrivacyInfo.svelte";
  import { processFile } from "./lib/processFile.js";

  let items = [];
  let showPrivacyInfo = false;
  let darkMode = false;

  $: anyProcessing = items.some((i) => i.status === "processing");
  $: idleCount = items.filter((i) => i.status === "idle").length;
  $: doneCount = items.filter((i) => i.status === "done").length;

  onMount(() => {
    const saved = localStorage.getItem("theme");
    darkMode = saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    updateTheme();
  });

  function updateTheme() {
    if (darkMode) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }

  function handleThemeToggle() {
    darkMode = !darkMode;
    updateTheme();
  }

  function handleFilesSelected(event) {
    const newFiles = event.detail.files;
    const existingKeys = new Set(
      items.map((i) => `${i.file.name}-${i.file.size}-${i.file.lastModified}`)
    );
    const toAdd = newFiles
      .filter(
        (f) =>
          !existingKeys.has(`${f.name}-${f.size}-${f.lastModified}`)
      )
      .map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        previewUrl: URL.createObjectURL(f),
        status: "idle",
        result: null,
      }));
    items = [...items, ...toAdd];
  }

  function updateItem(id, patch) {
    items = items.map((i) => (i.id === id ? { ...i, ...patch } : i));
  }

  async function processAll() {
    const idle = items.filter((i) => i.status === "idle");
    await Promise.all(idle.map((item) => processSingle(item.id)));
  }

  async function processSingle(id) {
    const item = items.find((i) => i.id === id);
    if (!item || item.status !== "idle") return;
    updateItem(id, { status: "processing" });
    try {
      const result = await processFile(item.file);
      updateItem(id, { status: "done", result });
    } catch {
      updateItem(id, { status: "error" });
    }
  }

  function removeItem(id) {
    const item = items.find((i) => i.id === id);
    if (item) {
      URL.revokeObjectURL(item.previewUrl);
      if (item.result?.url) URL.revokeObjectURL(item.result.url);
    }
    items = items.filter((i) => i.id !== id);
  }

  function clearAll() {
    items.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
      if (item.result?.url) URL.revokeObjectURL(item.result.url);
    });
    items = [];
  }

  function downloadAll() {
    items
      .filter((i) => i.status === "done")
      .forEach((item, idx) => {
        setTimeout(() => {
          const a = document.createElement("a");
          a.href = item.result.url;
          a.download = item.result.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, idx * 300);
      });
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<ThemeToggle {darkMode} on:toggle={handleThemeToggle} />

<main class="container py-8">
  <Header />

  <div class="grid gap-6">
    <!-- Upload -->
    <section class="card">
      <h2 class="text-xl font-bold mb-4">Upload Images</h2>
      <ImageUploader
        on:filesSelected={handleFilesSelected}
        disabled={anyProcessing}
      />
    </section>

    <!-- Items list -->
    {#if items.length > 0}
      <section class="card">
        <!-- Toolbar -->
        <div class="toolbar">
          <span class="toolbar-info">
            {items.length} image{items.length !== 1 ? "s" : ""}
            {#if doneCount > 0}&bull; {doneCount} cleaned{/if}
            {#if anyProcessing}&bull; processing…{/if}
          </span>
          <div class="toolbar-actions">
            {#if idleCount > 0}
              <button
                class="btn btn-primary"
                on:click={processAll}
                disabled={anyProcessing}
              >
                Remove Metadata{idleCount < items.length
                  ? ` (${idleCount})`
                  : ""}
              </button>
            {/if}
            {#if doneCount > 0}
              <button class="btn btn-success" on:click={downloadAll}>
                ↓ Download All ({doneCount})
              </button>
            {/if}
            <button
              class="btn btn-ghost"
              on:click={clearAll}
              disabled={anyProcessing}
            >
              Clear All
            </button>
          </div>
        </div>

        <!-- Progress bar (while processing) -->
        {#if anyProcessing}
          <div class="progress-bar mt-4">
            <div
              class="progress-fill"
              style="width: {(doneCount / items.length) * 100}%;"
            ></div>
          </div>
          <p class="text-xs text-secondary mt-1">
            {doneCount} / {items.length} processed
          </p>
        {/if}

        <!-- Grid -->
        <div class="items-grid mt-4">
          {#each items as item (item.id)}
            <div
              class="item-card"
              class:item-done={item.status === "done"}
              class:item-error={item.status === "error"}
            >
              <!-- Thumbnail -->
              <div class="item-thumb">
                <img src={item.previewUrl} alt={item.file.name} />
                {#if item.status === "processing"}
                  <div class="thumb-overlay">
                    <div class="spinner"></div>
                  </div>
                {:else if item.status === "done"}
                  <div class="thumb-badge badge-done">✓</div>
                {:else if item.status === "error"}
                  <div class="thumb-badge badge-error">✕</div>
                {/if}
              </div>

              <!-- Info -->
              <div class="item-body">
                <p class="item-name" title={item.file.name}>
                  {item.file.name}
                </p>
                <p class="item-size">
                  {formatSize(item.file.size)}
                  {#if item.status === "done"}
                    → {formatSize(item.result.size)}
                    {#if item.result.compressionRatio > 0}
                      <span class="text-success"
                        >(−{item.result.compressionRatio}%)</span
                      >
                    {/if}
                  {:else if item.status === "processing"}
                    <span class="text-secondary">Processing…</span>
                  {:else if item.status === "error"}
                    <span class="text-error">Failed</span>
                  {/if}
                </p>
              </div>

              <!-- Actions -->
              <div class="item-actions">
                {#if item.status === "done"}
                  <a
                    href={item.result.url}
                    download={item.result.filename}
                    class="btn btn-success btn-sm flex-1"
                  >
                    ↓ Download
                  </a>
                {:else if item.status === "idle"}
                  <button
                    class="btn btn-primary btn-sm flex-1"
                    on:click={() => processSingle(item.id)}
                    disabled={anyProcessing}
                  >
                    Clean
                  </button>
                {/if}
                <button
                  class="btn btn-ghost btn-sm icon-btn"
                  on:click={() => removeItem(item.id)}
                  title="Remove"
                  disabled={item.status === "processing"}
                >
                  ✕
                </button>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Privacy section -->
    <section class="card">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">🔐 Privacy & Security</h2>
        <button
          class="btn btn-ghost text-sm"
          on:click={() => (showPrivacyInfo = !showPrivacyInfo)}
          type="button"
        >
          {showPrivacyInfo ? "Hide" : "Show"} Details
        </button>
      </div>
      <div class="mb-3">
        <p class="text-sm text-secondary">
          <span class="text-success font-semibold">✓</span> 100% client-side
          processing
          <span class="mx-2">•</span>
          <span class="text-success font-semibold">✓</span> No data collection
          <span class="mx-2">•</span>
          <span class="text-success font-semibold">✓</span> Open source
        </p>
      </div>
      {#if showPrivacyInfo}
        <PrivacyInfo />
      {/if}
    </section>
  </div>
</main>

<Footer />

<style>
  .grid {
    display: grid;
    gap: 1.5rem;
  }

  /* Toolbar */
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .toolbar-info {
    font-weight: 500;
  }
  .toolbar-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  /* Progress */
  .progress-bar {
    width: 100%;
    height: 4px;
    background: var(--border-color);
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--primary-color);
    transition: width 0.3s ease;
  }

  /* Items grid */
  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 1rem;
  }

  /* Item card */
  .item-card {
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary);
    transition: box-shadow 0.2s;
  }
  .item-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  .item-done {
    border-color: var(--success-color);
  }
  .item-error {
    border-color: #ef4444;
  }

  /* Thumbnail */
  .item-thumb {
    position: relative;
    height: 130px;
    overflow: hidden;
    background: var(--bg-secondary);
  }
  .item-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .thumb-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .thumb-badge {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: bold;
    color: white;
  }
  .badge-done {
    background: var(--success-color);
  }
  .badge-error {
    background: #ef4444;
  }

  /* Spinner */
  .spinner {
    width: 1.75rem;
    height: 1.75rem;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Item body */
  .item-body {
    padding: 0.6rem 0.75rem;
    flex: 1;
  }
  .item-name {
    font-size: 0.8rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 0.2rem;
  }
  .item-size {
    font-size: 0.72rem;
    color: var(--text-secondary);
  }

  /* Item actions */
  .item-actions {
    padding: 0.5rem 0.6rem;
    display: flex;
    gap: 0.4rem;
    border-top: 1px solid var(--border-color);
    align-items: center;
  }
  .flex-1 {
    flex: 1;
  }
  .icon-btn {
    padding: 0.25rem 0.5rem;
    flex-shrink: 0;
  }

  /* Text helpers */
  .text-secondary {
    color: var(--text-secondary);
  }
  .text-success {
    color: var(--success-color);
  }
  .text-error {
    color: #ef4444;
  }
  .text-sm {
    font-size: 0.875rem;
  }
  .text-xs {
    font-size: 0.75rem;
  }

  /* Btn ghost */
  .btn-ghost {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
  }
  .btn-ghost:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
</style>
