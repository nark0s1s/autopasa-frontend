import useMediaQuery from '../hooks/useMediaQuery'
import { useLiquidacionGrifero } from '../hooks/useLiquidacionGrifero'
import { LiquidacionGriferoLoading } from './LiquidacionGriferoShared'
import LiquidacionGriferoDesktop from './LiquidacionGriferoDesktop'
import LiquidacionGriferoMobile from './LiquidacionGriferoMobile'

/** Punto de entrada: elige layout móvil (<768px) o escritorio según el viewport. */
function LiquidacionGrifero() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const props = useLiquidacionGrifero()

  if (props.loading) {
    return <LiquidacionGriferoLoading />
  }

  return isMobile ? (
    <LiquidacionGriferoMobile {...props} />
  ) : (
    <LiquidacionGriferoDesktop {...props} />
  )
}

export default LiquidacionGrifero
