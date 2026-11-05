import React from 'react';
import { GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useTrainingContent } from '@/hooks/useTrainingContent';
import { useTutorialHint } from '@/hooks/useTutorialHint';

/**
 * Atalho do portal de treinamento no header (issue #103).
 * - o ícone só aparece quando há conteúdo publicado no portal;
 * - após 5s parado na mesma página, um balão discreto convida o usuário
 *   a abrir o tutorial (some depois do primeiro acesso).
 */
export const TutorialHint: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasContent } = useTrainingContent();
  const { show, markSeen } = useTutorialHint();

  if (!hasContent) return null;

  const openTraining = () => {
    markSeen();
    navigate('/treinamento');
  };

  return (
    <div className="tutorial-hint-wrap">
      <button
        type="button"
        className="header-icon-btn tutorial-hint-btn"
        id="header-training-btn"
        onClick={openTraining}
        aria-label={t('Treinamento')}
        title={t('Treinamento')}
      >
        <GraduationCap size={19} />
      </button>
      {show && (
        <div className="tutorial-hint" role="status">
          <span className="tutorial-hint-icon">
            <GraduationCap size={14} />
          </span>
          {t('Tem alguma dúvida? Acesse o tutorial')}
        </div>
      )}
    </div>
  );
};
