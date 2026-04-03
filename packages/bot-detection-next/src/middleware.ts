import { NextResponse, type NextRequest } from 'next/server'

export interface BotDetectionMiddlewareConfig {
  headerName?: string
  cookieName?: string
  protectedPaths?: string[]
  onBotDetected?: (
    request: NextRequest,
    score: number
  ) => NextResponse | Promise<NextResponse> | null
}

const DEFAULT_HEADER = 'x-bot-score'
const DEFAULT_COOKIE = 'botd-result'

export function createBotDetectionMiddleware(config?: BotDetectionMiddlewareConfig) {
  const {
    headerName = DEFAULT_HEADER,
    cookieName = DEFAULT_COOKIE,
    protectedPaths,
    onBotDetected,
  } = config ?? {}

  return async function botDetectionMiddleware(request: NextRequest): Promise<NextResponse> {
    if (protectedPaths) {
      const isProtected = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))
      if (!isProtected) return NextResponse.next()
    }

    const cookie = request.cookies.get(cookieName)
    if (!cookie?.value) return NextResponse.next()

    let parsed: { bot?: boolean; score?: number } | undefined
    try {
      parsed = JSON.parse(cookie.value) as { bot?: boolean; score?: number }
    } catch {
      return NextResponse.next()
    }

    const score = parsed?.score ?? 0
    const isBot = parsed?.bot === true

    if (isBot && onBotDetected) {
      const customResponse = await onBotDetected(request, score)
      if (customResponse) return customResponse
    }

    const response = NextResponse.next()
    response.headers.set(headerName, String(score))
    if (isBot) {
      response.headers.set('x-bot-detected', 'true')
    }
    return response
  }
}
