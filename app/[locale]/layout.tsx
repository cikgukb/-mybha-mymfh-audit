import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales } from '@/i18n'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const { locale } = params
  if (!locales.includes(locale as typeof locales[number])) notFound()

  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <div lang={locale} className="bg-gray-50 text-gray-900 antialiased min-h-screen">
        {children}
      </div>
    </NextIntlClientProvider>
  )
}
