import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button, Input } from '@/components';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import type { Customer } from '@/types';

const mockCustomers: Customer[] = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '(11) 99999-9999',
    mobile: '(11) 98888-8888',
    cpf_cnpj: '123.456.789-00',
    address: 'Rua das Flores, 123',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '01234-567',
    notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    tenant_id: 'tenant-1',
    name: 'Maria Santos',
    email: 'maria@email.com',
    phone: '(21) 99999-8888',
    mobile: '(21) 98888-7777',
    cpf_cnpj: '987.654.321-00',
    address: 'Av. Central, 456',
    city: 'Rio de Janeiro',
    state: 'RJ',
    zip_code: '20000-000',
    notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const Customers: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers] = useState<Customer[]>(mockCustomers);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('Clientes')}</h1>
        <Button variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          {t('Novo')}
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder={t('Digite para buscar...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Nome')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Telefone')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Cidade')}/{t('Estado')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Ações')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.cpf_cnpj}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {customer.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {customer.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {customer.city}/{customer.state}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('Nenhum registro encontrado')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
