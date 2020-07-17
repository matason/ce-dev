import ComposeConfigCeDev from './compose-config-ce-dev-interface'
import ComposeConfigService from './compose-config-service-interface'
/**
 * Describes a docker compose structure.
 */

export default interface ComposeConfig {
  'version': string
  'services': Record<string, ComposeConfigService>
  'networks'?: Record<string, object>,
  'volumes'?: Record<string, object>
  'x-ce_dev': ComposeConfigCeDev
}
