import React, { useEffect, useRef, useCallback } from "react";

export default function HomePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Function to update the iframe with the latest preview code
  const updatePreview = useCallback(() => {
    const storedPreviewCode = localStorage.getItem('previewCode');
    if (storedPreviewCode && iframeRef.current) {
      const iframeDocument = iframeRef.current.contentDocument;
      if (iframeDocument) {
        iframeDocument.open();
        iframeDocument.write(storedPreviewCode);
        iframeDocument.close();
        // Allow the content to render, then adjust iframe height to fit its content
        setTimeout(() => {
          if (
            iframeRef.current &&
            iframeRef.current.contentDocument &&
            iframeRef.current.contentDocument.body
          ) {
            const contentHeight = iframeRef.current.contentDocument.body.scrollHeight;
            iframeRef.current.style.height = `${contentHeight}px`;
          }
        }, 100);
      }
    }
  }, []);

  useEffect(() => {
    // Initial update when the component mounts
    updatePreview();

    // Listen for storage events (fires when previewCode changes in another tab)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'previewCode') {
        updatePreview();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [updatePreview]);

  return (
    // The main container is scrollable if the iframe becomes larger than the viewport
    <main style={{ width: "100vw", overflow: "auto", background: "#fff" }}>
      <iframe
        ref={iframeRef}
        title="Live Preview"
        style={{ width: "100%", border: "1px solid black" }}
      />
    </main>
  );
}
