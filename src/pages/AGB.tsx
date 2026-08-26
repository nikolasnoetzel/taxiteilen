import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";

const Placeholder = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded bg-accent/40 px-1 py-0.5 font-semibold">{children}</span>
);

const AGB = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 px-4 py-12">
        <article className="mx-auto max-w-[720px] space-y-8">
          <header className="space-y-3">
            <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Allgemeine Geschäftsbedingungen
            </h1>
            <Badge variant="outline" className="text-muted-foreground">
              Zuletzt aktualisiert: 7. Juli 2026
            </Badge>
          </header>

          <div className="space-y-6 text-base leading-relaxed text-foreground/90">
            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 1 Geltungsbereich und Vertragsparteien</h2>
              <p>TaxiTeilen (<Placeholder>[BETREIBER]</Placeholder>) betreibt eine Plattform zur Koordination geteilter Taxifahrten. TaxiTeilen ist ausschließlich Koordinationsdienstleister und weder Beförderungsunternehmen noch Vertragspartner der Taxiunternehmen. Der Beförderungsvertrag kommt ausschließlich zwischen dem Initiator und dem gebuchten Taxiunternehmen zustande.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 2 Leistungsbeschreibung</h2>
              <p>Die Plattform ermöglicht Nutzern, sich für geteilte Taxifahrten auf festgelegten Strecken zu verabreden. TaxiTeilen legt für jede Strecke einen Festpreis fest, koordiniert die Kostenaufteilung unter den Mitfahrenden und wickelt die Zahlung der Mitfahrer-Anteile treuhänderisch über den Zahlungsdienstleister Stripe ab. TaxiTeilen empfiehlt lokale Taxiunternehmen mit Kontaktdaten, übernimmt aber keine Haftung für deren Leistungen, Pünktlichkeit oder Verfügbarkeit.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 3 Registrierung</h2>
              <p>Die Nutzung setzt eine Registrierung voraus. Alle Angaben müssen wahrheitsgemäß sein. Mindestalter: 18 Jahre. Pro Person ist nur ein Konto zulässig.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 4 Der Initiator</h2>
              <p>Der Initiator legt eine Fahrt an und ist verpflichtet:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>vor Veröffentlichung der Fahrt ein Auszahlungskonto über Stripe einzurichten,</li>
                <li>das Taxi rechtzeitig — spätestens 60 Minuten vor der geplanten Abfahrt — telefonisch zu bestellen,</li>
                <li>den Taxifahrer direkt zu bezahlen und</li>
                <li>die Gruppe über Treffpunkt und Details zu informieren.</li>
              </ul>
              <p>Als Gegenleistung erhält der Initiator die Fahrtanteile aller zahlenden Mitfahrenden automatisch ausgezahlt (ca. 48 Stunden nach Abfahrt). Sagt der Initiator eine Fahrt weniger als 24 Stunden vor Abfahrt ab oder erscheint er nicht, erhalten alle Mitfahrenden ihre Zahlung vollständig zurück; das Konto des Initiators wird verwarnt und nach drei Verwarnungen gesperrt.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 5 Festpreis, Kostenaufteilung und Servicegebühr</h2>
              <p>Jede Strecke hat einen von TaxiTeilen festgelegten Festpreis. Der Anteil pro Platz ergibt sich aus dem Festpreis geteilt durch die Anzahl der angebotenen Plätze und wird bei Erstellung der Fahrt fixiert. Mitfahrende zahlen ihren Anteil zuzüglich einer Servicegebühr von 15 % auf den Anteil. Der Initiator erhält den vollen Anteil; die Servicegebühr verbleibt bei TaxiTeilen.</p>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm"><strong>Beispiel:</strong> Strecke mit Festpreis 120 €, 4 Plätze → Anteil 30 € pro Platz. Ein Mitfahrender zahlt 34,50 € (30 € Anteil + 4,50 € Servicegebühr). Der Initiator zahlt das Taxi (120 €) und erhält je Mitfahrenden 30 € ausgezahlt.</p>
              </div>
              <p>Der Anteil pro Platz richtet sich nach den angebotenen Plätzen, nicht nach der tatsächlichen Belegung. Weicht der Taxameterpreis vom Festpreis ab, geht dies zu Lasten bzw. zu Gunsten des Initiators.</p>
              <p>Die Zahlung erfolgt über Stripe (Karte, Apple Pay, Google Pay). Die Beträge werden bis zur Auszahlung an den Initiator treuhänderisch auf dem Stripe-Konto der Plattform gehalten. TaxiTeilen ist kein Zahlungsdienstleister im Sinne des Zahlungsdiensteaufsichtsgesetzes (ZAG), da die Zahlungsabwicklung ausschließlich durch Stripe als lizenziertem Zahlungsdienstleister erfolgt.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 6 Stornierung und Rücktritt</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-left font-semibold text-foreground">Fall</th>
                      <th className="p-3 text-left font-semibold text-foreground">Folge</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="p-3">Mitfahrender storniert mindestens 24 Stunden vor Abfahrt</td>
                      <td className="p-3">Kostenfrei; vollständige Rückerstattung (Anteil + Servicegebühr)</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3">Mitfahrender storniert weniger als 24 Stunden vor Abfahrt oder erscheint nicht</td>
                      <td className="p-3">Keine Rückerstattung; der Anteil wird dem Initiator ausgezahlt, die Servicegebühr verbleibt bei TaxiTeilen</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3">Initiator sagt mindestens 24 Stunden vor Abfahrt ab</td>
                      <td className="p-3">Mitfahrende können die Fahrt als neuer Initiator übernehmen; andernfalls wird die Fahrt aufgelöst und alle Zahlungen werden vollständig erstattet</td>
                    </tr>
                    <tr>
                      <td className="p-3">Initiator sagt weniger als 24 Stunden vor Abfahrt ab oder erscheint nicht</td>
                      <td className="p-3">Vollständige Rückerstattung an alle Mitfahrenden; Verwarnung des Initiators (drei Verwarnungen führen zur Kontosperrung)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>Fahrten ohne zahlende Mitfahrende kann der Initiator jederzeit kostenfrei absagen. Meldet ein Nutzer innerhalb von 48 Stunden nach Abfahrt ein Problem (z. B. Fahrt hat nicht stattgefunden), wird die Auszahlung bis zur Klärung durch TaxiTeilen ausgesetzt.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 7 Haftungsausschluss</h2>
              <p>TaxiTeilen haftet nicht für:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Schäden durch das gebuchte Taxiunternehmen</li>
                <li>Verspätungen oder Ausfälle des Taxis</li>
                <li>Abweichungen des tatsächlichen Fahrpreises vom Festpreis</li>
                <li>Schäden durch höhere Gewalt, Streik oder behördliche Maßnahmen</li>
              </ul>
              <p>Die Haftung von TaxiTeilen ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Die Haftungsbeschränkung gilt nicht bei Verletzung von Leben, Körper oder Gesundheit.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 8 Nutzerverhalten</h2>
              <p>Nutzer verpflichten sich zu respektvollem Verhalten gegenüber Mitfahrenden und Taxifahrern. TaxiTeilen kann Nutzer bei wiederholten oder schwerwiegenden Verstößen ohne Vorwarnung sperren.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 9 Änderungen der AGB</h2>
              <p>TaxiTeilen informiert Nutzer über wesentliche AGB-Änderungen per E-Mail mit 30 Tagen Vorlauf. Widerspricht der Nutzer nicht innerhalb von 14 Tagen nach Zugang der Mitteilung, gelten die neuen AGB als angenommen. Auf diesen Umstand wird in der Mitteilung ausdrücklich hingewiesen.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 10 Anwendbares Recht und Gerichtsstand</h2>
              <p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand für Kaufleute ist <Placeholder>[STADT des Betreibers]</Placeholder>.</p>
              <p>Stand: 7. Juli 2026</p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default AGB;
