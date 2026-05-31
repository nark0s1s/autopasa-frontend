import { TabLecturas } from './Tabs/TabLecturas'
import { TabVentas } from './Tabs/TabVentas'
import { TabPOS } from './Tabs/TabPOS'
import { TabGNV } from './Tabs/TabGNV'
import { TabVentasGuia } from './Tabs/TabVentasGuia'
import { TabVales } from './Tabs/TabVales'
import { TabDescuentos } from './Tabs/TabDescuentos'
import { TabDepositos } from './Tabs/TabDepositos'
import { TabTransferenciasBancarias } from './Tabs/TabTransferenciasBancarias'

export function TurnoDetalleTabPanels({
  tabActiva,
  turno,
  contometros,
  productos,
  tiposVale,
  onReload,
  onMensaje,
  contentClassName = 'p-6',
}) {
  return (
    <div className={contentClassName}>
      {tabActiva === 'lecturas' && (
        <TabLecturas turno={turno} contometros={contometros} onReload={onReload} onMensaje={onMensaje} />
      )}
      {tabActiva === 'ventas' && (
        <TabVentas turno={turno} productos={productos} onReload={onReload} onMensaje={onMensaje} />
      )}
      {tabActiva === 'pos' && <TabPOS turno={turno} onReload={onReload} onMensaje={onMensaje} />}
      {tabActiva === 'gnv' && <TabGNV turno={turno} onReload={onReload} onMensaje={onMensaje} />}
      {tabActiva === 'guia_credito' && (
        <TabVentasGuia turno={turno} tipo="credito" onReload={onReload} onMensaje={onMensaje} />
      )}
      {tabActiva === 'guia_remision' && (
        <TabVentasGuia turno={turno} tipo="remision" onReload={onReload} onMensaje={onMensaje} />
      )}
      {tabActiva === 'vales' && (
        <TabVales turno={turno} tiposVale={tiposVale} onReload={onReload} onMensaje={onMensaje} />
      )}
      {tabActiva === 'descuentos' && (
        <TabDescuentos turno={turno} onReload={onReload} onMensaje={onMensaje} />
      )}
      {tabActiva === 'depositos' && (
        <TabDepositos turno={turno} onReload={onReload} onMensaje={onMensaje} />
      )}
      {tabActiva === 'transferencias' && (
        <TabTransferenciasBancarias turno={turno} onReload={onReload} onMensaje={onMensaje} />
      )}
    </div>
  )
}
