import {
  Gauge,
  ShoppingCart,
  CreditCard,
  FileText,
  Receipt,
  DollarSign,
  Percent,
  Flame,
  Landmark,
} from 'lucide-react'

export const TAB_CONFIG = [
  { id: 'lecturas', label: 'Lecturas Contómetro', shortLabel: 'Lecturas', icon: Gauge },
  { id: 'ventas', label: 'Ventas Productos', shortLabel: 'Productos', icon: ShoppingCart },
  { id: 'pos', label: 'Ventas POS', shortLabel: 'POS', icon: CreditCard },
  { id: 'gnv', label: 'GNV', shortLabel: 'GNV', icon: Flame },
  { id: 'guia_credito', label: 'Guía crédito', shortLabel: 'Crédito', icon: FileText },
  { id: 'guia_remision', label: 'Guía remisión', shortLabel: 'Remisión', icon: FileText },
  { id: 'vales', label: 'Vales', shortLabel: 'Vales', icon: Receipt },
  { id: 'descuentos', label: 'Descuentos', shortLabel: 'Descuentos', icon: Percent },
  { id: 'depositos', label: 'Depósitos', shortLabel: 'Depósitos', icon: DollarSign },
  { id: 'transferencias', label: 'Transferencias', shortLabel: 'Transf.', icon: Landmark },
]
