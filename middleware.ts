import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { locales, defaultLocale } from './i18n'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // Handle Supabase auth session refresh
  let response = intlMiddleware(request)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = intlMiddleware(request)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Determine locale from pathname
  const localeMatch = pathname.match(/^\/(en|ms|ar)/)
  const locale = localeMatch ? localeMatch[1] : defaultLocale
  const pathWithoutLocale = localeMatch ? pathname.slice(localeMatch[0].length) || '/' : pathname

  // Auth guard: redirect unauthenticated users to login
  const publicPaths = ['/login', '/']
  const isPublic = publicPaths.some(p => pathWithoutLocale === p || pathWithoutLocale.startsWith('/login'))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }

  if (user && pathWithoutLocale === '/login') {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
