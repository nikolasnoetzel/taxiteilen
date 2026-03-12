/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Bestätigungscode – Taxi Teilen</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logoText}>🚕 Taxi Teilen</Text>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Bestätigungscode</Heading>
          <Text style={text}>
            Verwende den folgenden Code, um deine Identität zu bestätigen:
          </Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={textSmall}>Dieser Code ist nur kurze Zeit gültig.</Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          Falls du diesen Code nicht angefordert hast, kannst du diese E-Mail ignorieren.
        </Text>
        <Text style={footerBrand}>© Taxi Teilen · Gemeinsam günstiger ans Ziel</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif" }
const container = { maxWidth: '480px', margin: '0 auto', padding: '0' }
const header = { backgroundColor: '#1e2a3f', padding: '24px 32px', borderRadius: '12px 12px 0 0' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", color: '#f0a500', margin: '0' }
const content = { padding: '32px 32px 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", color: '#141c2e', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px' }
const textSmall = { fontSize: '13px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 8px' }
const codeStyle = {
  fontFamily: "'Space Grotesk', Courier, monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#1e2a3f',
  backgroundColor: '#f5f3ef',
  padding: '16px 24px',
  borderRadius: '12px',
  textAlign: 'center' as const,
  letterSpacing: '4px',
  margin: '0 0 24px',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 32px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0 32px 8px', lineHeight: '1.5' }
const footerBrand = { fontSize: '12px', color: '#9ca3af', margin: '0 32px 24px', fontStyle: 'italic' as const }
