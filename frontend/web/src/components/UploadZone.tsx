/** Componente de upload com arrastar e soltar para diagramas de arquitetura. */

import { useCallback, useState, useRef } from 'react'

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

/** Executa a funcao UploadZone. */
export default function UploadZone({ onFileSelected, disabled }: UploadZoneProps) {
  const [dragover, setDragover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragover(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected, disabled]
  );

  /** Executa a funcao handleClick. */
  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  /** Executa a funcao handleChange. */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div
      className={`upload-zone ${dragover ? 'dragover' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
      onDragLeave={() => setDragover(false)}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className="icon">[DIAGRAMA]</div>
      <h3>Enviar Diagrama de Arquitetura</h3>
      <p>Arraste e solte uma imagem PNG, JPG, JPEG, GIF, WEBP ou BMP, ou clique para selecionar</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  );
}
