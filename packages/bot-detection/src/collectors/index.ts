import { getUserPlatform } from './platform'
import { getUserAgent } from './user_agent'

export const collectors = {
  userAgent: getUserAgent,
  platform: getUserPlatform,
}
