import React from 'react';
import { Plus } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { CompanyFormModal } from './companies/CompanyFormModal';
import { CompaniesGrid } from './companies/CompaniesGrid';
import { CredentialsModal } from './companies/CredentialsModal';
import { useCompanies } from './companies/useCompanies';

export const SuperAdminCompanies: React.FC = () => {
  const c = useCompanies();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Empresas</h1>
          <p className="page-subtitle">
            {c.companies.length} empresas cadastradas na plataforma
          </p>
        </div>
        <button
          className="btn"
          onClick={c.openNew}
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none' }}
        >
          <Plus size={16} />
          Nova Empresa
        </button>
      </div>

      <CompaniesGrid
        companies={c.filtered}
        loading={c.loading}
        search={c.search}
        onSearchChange={c.setSearch}
        onEdit={c.openEdit}
        onDelete={c.handleDelete}
        onCreate={c.openNew}
      />

      {c.showModal && (
        <CompanyFormModal
          editingCompany={c.editingCompany}
          form={c.form}
          plans={c.plansList}
          saving={c.saving}
          saveError={c.saveError}
          onChange={(patch) => c.setForm((f) => ({ ...f, ...patch }))}
          onClose={() => c.setShowModal(false)}
          onSave={c.handleSave}
          onRequestReset={() => { c.setSaveError(null); c.setConfirmReset(true); }}
          onRequestFinalize={() => { c.setSaveError(null); c.setConfirmWizardFinish(true); }}
        />
      )}

      <CredentialsModal credentials={c.credentials} onClose={() => c.setCredentials(null)} />

      <ConfirmModal
        isOpen={c.confirmWizardFinish}
        onClose={() => c.setConfirmWizardFinish(false)}
        onConfirm={c.handleWizardFinalize}
        title="Finalizar cadastro manualmente?"
        message="Confirma o pagamento e conclui as etapas finais do wizard: cria o usuario administrador, marca o pagamento como confirmado e ativa a empresa. Use quando o cliente pagou direto com voce e nao concluiu o wizard. Deseja continuar?"
        confirmLabel="Finalizar e criar admin"
        loading={c.finalizingWizard}
        variant="warning"
      />

      <ConfirmModal
        isOpen={c.confirmDelete.isOpen}
        onClose={() => c.setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={c.confirmDeleteAction}
        title="Remover empresa"
        message="Tem certeza que deseja remover esta empresa? Todos os dados associados serão perdidos. Esta ação não pode ser desfeita."
        variant="danger"
      />

      <ConfirmModal
        isOpen={c.confirmReset}
        onClose={() => c.setConfirmReset(false)}
        onConfirm={c.handleResetPassword}
        loading={c.resetting}
        title="Regerar senha"
        message={`Gera uma nova senha aleatória para o administrador de ${c.editingCompany?.name || 'esta empresa'}. A senha atual deixa de funcionar imediatamente.`}
        confirmLabel="Regerar senha"
        variant="warning"
      />
    </div>
  );
};
