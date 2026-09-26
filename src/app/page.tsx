"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import "./upload-queue.css";

type QueueFile = File & { webkitRelativePath?: string };

type UploadState = "idle" | "uploading" | "complete" | "error";
type FileUploadState = { status: "queued" | "uploading" | "complete" | "error"; progress: number };

export default function Home() {
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<QueueFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [fileStates, setFileStates] = useState<FileUploadState[]>([]);
  const [message, setMessage] = useState("");

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const folderNames = useMemo(() => {
    const names = new Set(files.map((file) => file.webkitRelativePath?.split("/")[0]).filter(Boolean));
    return [...names];
  }, [files]);

  function addFiles(incoming: FileList | File[]) {
    if (uploadState === "uploading") return;
    const next = Array.from(incoming) as QueueFile[];
    const existing = new Set(files.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
    const additions = next.filter((file) => {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (existing.has(key)) return false;
      existing.add(key);
      return true;
    });
    if (!additions.length) return;
    setFiles((current) => [...current, ...additions]);
    setFileStates([...files, ...additions].map(() => ({ status: "queued", progress: 0 })));
    setProgress(0);
    setUploadedBytes(0);
    setUploadState("idle");
    setMessage("");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  }

  async function upload() {
    if (!files.length) return;
    setUploadState("uploading");
    setProgress(0);
    setUploadedBytes(0);
    setFileStates(files.map(() => ({ status: "queued", progress: 0 })));
    setMessage("");

    let completedBytes = 0;
    let activeIndex = -1;
    try {
      for (const [index, file] of files.entries()) {
        activeIndex = index;
        setFileStates((states) => states.map((state, itemIndex) => itemIndex === index ? { ...state, status: "uploading" } : state));
        const formData = new FormData();
        formData.append("file", file);
        formData.append("relativePath", file.webkitRelativePath || file.name);
        await uploadFile(formData, (fileProgress) => {
          const bytes = completedBytes + file.size * fileProgress;
          setUploadedBytes(bytes);
          setProgress(totalSize ? Math.round((bytes / totalSize) * 100) : 0);
          setFileStates((states) => states.map((state, itemIndex) => itemIndex === index ? { ...state, progress: Math.round(fileProgress * 100) } : state));
        });
        completedBytes += file.size;
        setUploadedBytes(completedBytes);
        setFileStates((states) => states.map((state, itemIndex) => itemIndex === index ? { status: "complete", progress: 100 } : state));
      }
      setProgress(100);
      setUploadState("complete");
      setMessage(`${files.length} ${files.length === 1 ? "file" : "files"} uploaded successfully.`);
    } catch (error) {
      if (activeIndex >= 0) {
        setFileStates((states) => states.map((state, itemIndex) => itemIndex === activeIndex ? { ...state, status: "error" } : state));
      }
      setUploadState("error");
      setMessage(error instanceof Error ? error.message : "Upload failed. Please try again.");
    }
  }

  return (
    <main className="shell">
      <header className="topbar"><div className="brand-mark">SD</div><div><p className="eyebrow">S3 DROPZONE</p><p className="bucket">sudhishna-personal</p></div><span className="secure">PRIVATE BUCKET</span></header>
      <section className="intro"><p className="eyebrow">OBJECT STORAGE / INTAKE</p><h1>Drop a whole<br /><em>workspace</em> here.</h1><p className="lede">Files and folders land in S3 with their original structure intact. No zipping. No rearranging.</p></section>
      <section className="workspace">
        <div className={`dropzone ${isDragging ? "dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
          <div className="drop-icon">↥</div><h2>Drop files or folders</h2><p>or choose from your computer</p>
          <div className="actions"><button onClick={() => fileInput.current?.click()}>Choose files</button><button className="secondary" onClick={() => folderInput.current?.click()}>Choose a folder</button></div>
          <input ref={fileInput} type="file" multiple hidden onChange={handleInput} /><input ref={folderInput} type="file" multiple hidden {...({ webkitdirectory: "" } as object)} onChange={handleInput} />
        </div>
        <aside className="queue"><div className="queue-head"><div><p className="eyebrow">UPLOAD QUEUE</p><h2>{files.length ? `${files.length} ${files.length === 1 ? "item" : "items"}` : "Nothing queued"}</h2></div><span className="size">{formatBytes(totalSize)}</span></div>
          {files.length > 0 && <div className="upload-summary"><strong>{progress}%</strong><span>{formatBytes(uploadedBytes)} of {formatBytes(totalSize)}</span></div>}
          {files.length > 0 && <div className="file-list">{files.map((file, index) => {
            const state = fileStates[index] ?? { status: "queued", progress: 0 };
            return <div className={`file-row ${state.status}`} key={`${file.name}:${file.lastModified}`}>
              <span className="file-dot" />
              <div className="file-details"><strong>{file.name}</strong><small>{file.webkitRelativePath || "Root file"}</small>
                {state.status === "uploading" && <div className="file-progress"><span style={{ width: `${state.progress}%` }} /></div>}
              </div>
              <div className="file-meta"><span className="file-size">{formatBytes(file.size)}</span><span className="file-status">{state.status === "uploading" ? `${state.progress}%` : state.status}</span></div>
            </div>;
          })}</div>}
          {folderNames.length > 0 && <p className="structure">↳ Preserving {folderNames.join(", ")} folder structure</p>}
          <button className="upload" disabled={!files.length || uploadState === "uploading"} onClick={upload}>{uploadState === "uploading" ? `Uploading ${progress}%` : "Upload to S3  →"}</button>
          {uploadState === "uploading" && <div className="progress"><span style={{ width: `${progress}%` }} /></div>}{message && <p className={`status ${uploadState}`}>{message}</p>}
        </aside>
      </section>
      <footer><span>Authenticated upload gateway</span><span>Each file keeps its relative path</span></footer>
    </main>
  );
}

function formatBytes(bytes: number) { if (!bytes) return "0 B"; const units = ["B", "KB", "MB", "GB"]; const index = Math.floor(Math.log(bytes) / Math.log(1024)); return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`; }

function uploadFile(formData: FormData, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/upload");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(event.loaded / event.total, 1));
    };
    request.onload = () => {
      let response: { error?: string } = {};
      try { response = JSON.parse(request.responseText); } catch {}
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(response.error || "Upload failed"));
    };
    request.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    request.send(formData);
  });
}
