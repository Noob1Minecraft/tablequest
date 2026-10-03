import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { X, Download } from "lucide-react";
import type { Key } from "../i18n";
export type T = (key: Key, params?: Record<string, string | number>) => string;
export function Modal({
  title,
  close,
  closeLabel,
  children,
}: {
  title: string;
  close: () => void;
  closeLabel: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.showModal();
    return () => {
      dialog.close();
      queueMicrotask(() => {
        if (document.querySelector("dialog[open]")) return;
        const target =
          opener?.isConnected && opener !== document.body
            ? opener
            : document.querySelector<HTMLElement>(".menu-trigger");
        target?.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" aria-label={closeLabel} onClick={close}>
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function QRModal({ t, close }: { t: T; close: () => void }) {
  const [url, setUrl] = useState(() => {
    const link = new URL(location.href);
    link.searchParams.delete("demo");
    link.searchParams.delete("mode");
    return link.protocol === "https:" ? link.href : "";
  });
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);
  let valid = false;
  try {
    const u = new URL(url);
    valid =
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      u.hostname.includes(".") &&
      !/^(localhost|127\.|0\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
        u.hostname,
      ) &&
      !u.hostname.endsWith(".local");
  } catch {
    /* invalid input */
  }
  useEffect(() => {
    let live = true;
    setSvg("");
    setFailed(false);
    if (valid)
      import("qrcode")
        .then(({ default: QRCode }) =>
          QRCode.toString(url, {
            type: "svg",
            margin: 3,
            color: { dark: "#111310", light: "#ffffff" },
          }),
        )
        .then((result) => {
          if (live) setSvg(result);
        })
        .catch(() => {
          if (live) setFailed(true);
        });
    return () => {
      live = false;
    };
  }, [url, valid]);
  const src = svg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    : "";
  return (
    <Modal title={t("qrTitle")} close={close} closeLabel={t("close")}>
      <p>{t("qrDesc")}</p>
      <label className="field">
        {t("url")}
        <input
          type="url"
          value={url}
          placeholder="https://example.com/tablequest/"
          maxLength={1500}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      {url && !valid ? <p role="alert">{t("qrInvalid")}</p> : null}
      {failed ? <p role="alert">{t("qrError")}</p> : null}
      {src ? (
        <>
          <img className="qr-image" src={src} alt={t("qrTitle")} />
          <a className="button primary" href={src} download="tablequest-qr.svg">
            <Download size={18} />
            {t("qrDownload")}
          </a>
        </>
      ) : null}
    </Modal>
  );
}
