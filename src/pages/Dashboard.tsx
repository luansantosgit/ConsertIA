import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { FileText, Users, Package, DollarSign, TrendingUp, Clock } from 'lucide-react';

const stats = [
  { icon: FileText, label: 'OS Abertas', value: '12', change: '+2', color: 'blue' },
  { icon: Users, label: 'Clientes Ativos', value: '48', change: '+5', color: 'green' },
  { icon: Package, label: 'Produtos em Estoque', value: '234', change: '-3', color: 'yellow' },
  { icon: DollarSign, label: 'Faturamento Mês', value: 'R$ 18.500', change: '+12%', color: 'green' },
];

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('Dashboard')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-600">{t(stat.label)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">OS por Status</h3>
          <div className="space-y-3">
            {[
              { status: 'Em Andamento', count: 5, color: 'blue' },
              { status: 'Aguardando Aprovação', count: 3, color: 'yellow' },
              { status: 'Aguardando Peça', count: 2, color: 'orange' },
              { status: 'Pronto', count: 2, color: 'green' },
            ].map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full bg-${item.color}-500`} />
                  <span className="text-gray-700">{t(item.status)}</span>
                </div>
                <span className="font-medium text-gray-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividades Recentes</h3>
          <div className="space-y-4">
            {[
              { icon: FileText, text: 'Nova OS criada', time: '5 min atrás' },
              { icon: Users, text: 'Cliente cadastrado', time: '15 min atrás' },
              { icon: Clock, text: 'OS #123 atualizada', time: '1 hora atrás' },
              { icon: TrendingUp, text: 'Orçamento aprovado', time: '2 horas atrás' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3">
                <activity.icon className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{t(activity.text)}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
