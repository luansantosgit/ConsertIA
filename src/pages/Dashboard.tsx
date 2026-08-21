import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { FileText, Users, Package, DollarSign, TrendingUp, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const stats = [
  { icon: FileText, label: 'OS Abertas', value: '12', change: '+2', changeType: 'positive', color: 'blue' },
  { icon: Users, label: 'Clientes Ativos', value: '48', change: '+5', changeType: 'positive', color: 'green' },
  { icon: Package, label: 'Produtos em Estoque', value: '234', change: '-3', changeType: 'negative', color: 'yellow' },
  { icon: DollarSign, label: 'Faturamento Mês', value: 'R$ 18.500', change: '+12%', changeType: 'positive', color: 'green' },
];

const osByStatus = [
  { status: 'Em Andamento', count: 5, total: 20, color: 'blue' },
  { status: 'Aguardando Aprovação', count: 3, total: 20, color: 'yellow' },
  { status: 'Aguardando Peça', count: 2, total: 20, color: 'orange' },
  { status: 'Pronto', count: 2, total: 20, color: 'green' },
];

const recentActivities = [
  { icon: FileText, text: 'Nova OS criada', time: '5 min atrás', type: 'os' },
  { icon: Users, text: 'Cliente cadastrado', time: '15 min atrás', type: 'customer' },
  { icon: Clock, text: 'OS #123 atualizada', time: '1 hora atrás', type: 'os-update' },
  { icon: TrendingUp, text: 'Orçamento aprovado', time: '2 horas atrás', type: 'budget' },
];

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-6 animate-fade-in">
      {/* Header da página */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('Dashboard')}</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral do seu negócio</p>
      </div>
      
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-6 card-hover">
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                stat.changeType === 'positive' ? 'text-success' : 'text-danger'
              }`}>
                {stat.changeType === 'positive' ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                <span>{stat.change}</span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{t(stat.label)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Seção principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OS por Status */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{t('OS por Status')}</h3>
            <button className="btn btn-secondary text-sm">
              Ver todas
            </button>
          </div>
          <div className="space-y-4">
            {osByStatus.map((item) => (
              <div key={item.status} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-${item.color}-500`} />
                    <span className="text-sm text-gray-700">{t(item.status)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{item.count}</span>
                    <span className="text-xs text-gray-400">/ {item.total}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className={`bg-${item.color}-500 h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${(item.count / item.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Atividades Recentes */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{t('Atividades Recentes')}</h3>
            <button className="btn btn-secondary text-sm">
              Ver histórico
            </button>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`p-2 rounded-lg bg-${
                  activity.type === 'os' ? 'blue' :
                  activity.type === 'customer' ? 'green' :
                  activity.type === 'os-update' ? 'yellow' : 'purple'
                }-100`}>
                  <activity.icon className={`w-5 h-5 text-${
                    activity.type === 'os' ? 'blue' :
                    activity.type === 'customer' ? 'green' :
                    activity.type === 'os-update' ? 'yellow' : 'purple'
                  }-600`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t(activity.text)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
