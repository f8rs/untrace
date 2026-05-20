<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let disabled = false;

  let dragOver = false;
  let fileInput;

  const acceptedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/tiff",
    "image/heic",
    "image/avif",
  ];

  function handleDragOver(event) {
    event.preventDefault();
    if (!disabled) dragOver = true;
  }

  function handleDragLeave(event) {
    event.preventDefault();
    dragOver = false;
  }

  function handleDrop(event) {
    event.preventDefault();
    dragOver = false;
    if (disabled) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  }

  function handleFileInput(event) {
    if (disabled) return;
    const files = Array.from(event.target.files);
    if (files.length > 0) processFiles(files);
    // reset so same files can be re-selected
    event.target.value = "";
  }

  function processFiles(files) {
    const valid = files.filter((f) => acceptedTypes.includes(f.type));
    const invalid = files.length - valid.length;

    if (valid.length === 0) {
      alert("Supported formats: JPEG, PNG, TIFF, HEIC, AVIF");
      return;
    }
    if (invalid > 0) {
      alert(`${invalid} file(s) skipped — unsupported format.`);
    }

    dispatch("filesSelected", { files: valid });
  }

  function reset() {
    if (fileInput) fileInput.value = "";
    dispatch("reset");
  }
</script>

<div class="upload-section">
  <div
    class="upload-area"
    class:dragover={dragOver}
    class:disabled
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
    role="button"
    tabindex="0"
    on:click={() => !disabled && fileInput.click()}
    on:keydown={(e) =>
      (e.key === "Enter" || e.key === " ") && !disabled && fileInput.click()}
  >
    <div class="upload-icon">
      <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
        />
      </svg>
    </div>

    <h3 class="text-lg font-semibold mb-2">
      {dragOver ? "Drop images here" : "Upload Images"}
    </h3>

    <p class="text-secondary mb-2">
      Drag and drop images here, or click to browse
    </p>

    <p class="text-sm text-muted">
      Multiple files supported &bull; JPEG, PNG, TIFF, HEIC, AVIF
    </p>

    <input
      type="file"
      accept=".jpg,.jpeg,.png,.tiff,.tif,.heic,.avif"
      multiple
      bind:this={fileInput}
      on:change={handleFileInput}
      class="hidden"
      {disabled}
    />
  </div>
</div>

<style>
  .upload-section {
    width: 100%;
  }

  .disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .disabled:hover {
    transform: none !important;
    border-color: var(--border-color) !important;
    background-color: var(--bg-secondary) !important;
  }
</style>
