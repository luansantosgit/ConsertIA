import React from 'react';
import { Camera, FileText, Image as ImageIcon } from 'lucide-react';

interface AttachmentMenuProps {
  onCamera: () => void;
  onGallery: () => void;
  onDocument: () => void;
}

/** Balão flutuante do clipe com as fontes de anexo do app. */
export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({
  onCamera,
  onGallery,
  onDocument,
}) => (
  <div className="attach-menu" role="menu" aria-label="Anexar">
    <button type="button" className="attach-menu-item" role="menuitem" onClick={onCamera}>
      <span className="attach-menu-icon"><Camera size={18} /></span>
      <span className="attach-menu-label">
        Câmera
        <small>Foto ou vídeo</small>
      </span>
    </button>

    <button type="button" className="attach-menu-item" role="menuitem" onClick={onGallery}>
      <span className="attach-menu-icon"><ImageIcon size={18} /></span>
      <span className="attach-menu-label">
        Galeria
        <small>Fotos e vídeos do aparelho</small>
      </span>
    </button>

    <button type="button" className="attach-menu-item" role="menuitem" onClick={onDocument}>
      <span className="attach-menu-icon"><FileText size={18} /></span>
      <span className="attach-menu-label">
        Documento
        <small>PDF, planilhas e outros</small>
      </span>
    </button>
  </div>
);
