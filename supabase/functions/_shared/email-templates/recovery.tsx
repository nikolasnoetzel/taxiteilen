/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Passwort zurücksetzen – Taxi Teilen</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logoText}>🚕 Taxi Teilen</Text>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Passwort zurücksetzen</Heading>
          <Text style={text}>
            Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Klicke auf den Button, um ein neues Passwort zu wählen.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={confirmationUrl}>
              Neues Passwort wählen
            </Button>
          </Section>
          <Text style={textSmall}>Oder kopiere diesen Link in deinen Browser:</Text>
          <Text style={urlText}>{confirmationUrl}</Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          Falls du kein Passwort-Reset angefordert hast, kannst du diese E-Mail ignorieren. Dein Passwort bleibt unverändert.
        </Text>
        <Text style={footerBrand}>© Taxi Teilen · Gemeinsam günstiger ans Ziel</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif" }
const container = { maxWidth: '480px', margin: '0 auto', padding: '0' }
const header = { backgroundColor: '#1e2a3f', padding: '24px 32px', borderRadius: '12px 12px 0 0' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", color: '#f0a500', margin: '0' }
const content = { padding: '32px 32px 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", color: '#141c2e', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px' }
const textSmall = { fontSize: '13px', color: '#6b7280', lineHeight: '1.5', margin: '24px 0 4px' }
const urlText = { fontSize: '12px', color: '#9ca3af', lineHeight: '1.4', wordBreak: 'break-all' as const, margin: '0 0 8px' }
const buttonContainer = { textAlign: 'center' as const }
const button = { backgroundColor: '#f0a500', color: '#0f1624', fontSize: '15px', fontWeight: '600' as const, fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif", borderRadius: '12px', padding: '14px 32px', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '24px 32px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0 32px 8px', lineHeight: '1.5' }
const footerBrand = { fontSize: '12px', color: '#9ca3af', margin: '0 32px 24px', fontStyle: 'italic' as const }
