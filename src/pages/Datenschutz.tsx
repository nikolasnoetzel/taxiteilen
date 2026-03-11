import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";

const Placeholder = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded bg-primary/30 px-1 py-0.5 font-semibold">{children}</span>
);

const Datenschutz = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 px-4 py-12">
        <article className="mx-auto max-w-[720px] space-y-8">
          <header className="space-y-3">
            <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Datenschutzerklärung
            </h1>
            <Badge variant="outline" className="text-muted-foreground">
              Zuletzt aktualisiert: 11. März 2025
            </Badge>
          </header>

          <div className="space-y-6 text-base leading-relaxed text-foreground/90">
            <div className="rounded-lg border border-border bg-card p-6">
              <p className="font-semibold"><Placeholder>[BETREIBER]</Placeholder></p>
              <p><Placeholder>[STRASSE]</Placeholder>, <Placeholder>[PLZ]</Placeholder> <Placeholder>[STADT]</Placeholder></p>
              <p>E-Mail: <Placeholder>[EMAIL]</Placeholder></p>
            </div>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">1. Welche Daten wir erheben</h2>
              <ul className="list-disc space-y-2 pl-6">
                <li><strong>Registrierungsdaten:</strong> Name, E-Mail-Adresse</li>
                <li><strong>Nutzungsdaten:</strong> Flugnummer, Reiseroute, Mitfahrwunsch-Status, Initiator-Status</li>
                <li><strong>Zahlungsdaten:</strong> TaxiTeilen speichert keine Kreditkartendaten. Die Zahlungsabwicklung erfolgt ausschließlich über Stripe Payments Europe Ltd. TaxiTeilen erhält von Stripe ausschließlich anonymisierte Transaktionsreferenzen (Token).</li>
                <li><strong>Technische Daten:</strong> IP-Adresse, Browser-Typ, Gerätekennungen – erhoben durch Supabase (Lovable Cloud Infrastructure)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">2. Zwecke und Rechtsgrundlagen (Art. 6 DSGVO)</h2>
              <ul className="list-disc space-y-2 pl-6">
                <li>Bereitstellung der Plattformfunktionen — Art. 6 Abs. 1 lit. b (Vertragserfüllung)</li>
                <li>Zahlungsabwicklung über Stripe Connect — Art. 6 Abs. 1 lit. b</li>
                <li>Betrugsvorbeugung und Plattformsicherheit — Art. 6 Abs. 1 lit. f (berechtigte Interessen)</li>
                <li>Erfüllung gesetzlicher Pflichten — Art. 6 Abs. 1 lit. c</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">3. Weitergabe an Dritte</h2>
              <div className="space-y-3">
                <p><strong>Stripe Payments Europe Ltd.</strong> (Zahlungsabwicklung)<br />
                Sitz: Dublin, Irland. Datenverarbeitungsvertrag nach Art. 28 DSGVO vorhanden.<br />
                Stripe Privacy Policy: <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">https://stripe.com/de/privacy</a></p>
                <p><strong>Supabase Inc. / Lovable Cloud</strong> (Hosting & Datenbank)<br />
                Verarbeitung in der EU soweit möglich. Auftragsverarbeitungsvertrag (AVV) abgeschlossen.</p>
                <p>Keine Datenweitergabe an Taxiunternehmen. TaxiTeilen ist kein Vertragspartner der Taxiunternehmen und übermittelt diesen keine personenbezogenen Nutzerdaten.</p>
                <p>Keine Datenweitergabe zu Werbezwecken.</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">4. Speicherdauer</h2>
              <ul className="list-disc space-y-2 pl-6">
                <li>Nutzerdaten: bis zur Kontolöschung, spätestens 3 Jahre nach letzter Aktivität</li>
                <li>Transaktionsreferenzen: 10 Jahre (steuerliche Aufbewahrungspflicht, § 147 AO)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">5. Ihre Rechte (Art. 15–22 DSGVO)</h2>
              <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Anfragen bitte an: <Placeholder>[EMAIL]</Placeholder></p>
              <p>Beschwerderecht bei der zuständigen Datenschutzaufsichtsbehörde. Sofern der Betreiber in Schleswig-Holstein ansässig ist: Unabhängiges Landeszentrum für Datenschutz (ULD) Schleswig-Holstein, <a href="https://www.datenschutzzentrum.de" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">https://www.datenschutzzentrum.de</a></p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">6. Cookies und Tracking</h2>
              <p>TaxiTeilen verwendet ausschließlich technisch notwendige Cookies (Session-Management, Auth-Token). Keine Werbe-Cookies, kein Google Analytics, kein Meta Pixel, kein sonstiges Drittanbieter-Tracking.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">7. Änderungen</h2>
              <p>Bei wesentlichen Änderungen werden registrierte Nutzer per E-Mail mit 30 Tagen Vorlauf informiert. Stand: <Placeholder>[DATUM]</Placeholder></p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default Datenschutz;
