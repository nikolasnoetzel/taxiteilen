import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";

const Placeholder = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded bg-primary/30 px-1 py-0.5 font-semibold">{children}</span>
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
              Zuletzt aktualisiert: 11. März 2025
            </Badge>
          </header>

          <div className="space-y-6 text-base leading-relaxed text-foreground/90">
            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 1 Geltungsbereich und Vertragsparteien</h2>
              <p>TaxiTeilen (<Placeholder>[BETREIBER]</Placeholder>) betreibt eine Plattform zur Koordination von Taxifahrten. TaxiTeilen ist ausschließlich Koordinationsdienstleister und weder Beförderungsunternehmen noch Vertragspartner der Taxiunternehmen. Der Beförderungsvertrag kommt ausschließlich zwischen dem Initiator und dem gebuchten Taxiunternehmen zustande.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 2 Leistungsbeschreibung</h2>
              <p>Die Plattform ermöglicht Nutzern, sich anhand von Flugnummern und Reiserouten für geteilte Taxifahrten zu verabreden. TaxiTeilen koordiniert die Kostenaufteilung unter den Mitfahrenden. TaxiTeilen empfiehlt lokale Taxiunternehmen mit Kontaktdaten, übernimmt aber keine Haftung für deren Leistungen, Pünktlichkeit oder Verfügbarkeit.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 3 Registrierung</h2>
              <p>Die Nutzung setzt eine Registrierung voraus. Alle Angaben müssen wahrheitsgemäß sein. Mindestalter: 18 Jahre. Pro Person ist nur ein Konto zulässig.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 4 Der Initiator</h2>
              <p>Eine Person pro Fahrtgruppe übernimmt die Rolle des Initiators (freiwillig oder durch Gruppeneinigung). Der Initiator ist verpflichtet:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>das Taxi mindestens 60 Minuten vor der geplanten Abfahrt zu buchen</li>
                <li>eine gültige Kreditkarte über Stripe zu hinterlegen</li>
                <li>die Gruppe über Buchungsbestätigung und Taxidaten zu informieren</li>
              </ul>
              <p>Kommt der Initiator seiner Buchungspflicht nicht nach, haftet er für nachgewiesene Mehrkosten der übrigen Mitfahrenden.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 5 Kostenaufteilung und Plattformgebühr</h2>
              <p>Die Taxikosten werden zu gleichen Teilen auf alle bestätigten Mitfahrenden aufgeteilt. TaxiTeilen erhebt eine Plattformgebühr von 10 % auf den jeweiligen Nutzeranteil.</p>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm"><strong>Beispiel:</strong> Taxi Hamburg Flughafen → Kiel, 120 € / 3 Personen = 40 € je Person + 4 € Plattformgebühr = 44 € je Person.</p>
              </div>
              <p>Die Zahlung erfolgt über Stripe Connect. TaxiTeilen ist kein Zahlungsdienstleister im Sinne des Zahlungsdiensteaufsichtsgesetzes (ZAG), da die Zahlungsabwicklung ausschließlich durch Stripe als lizenziertem Zahlungsdienstleister erfolgt.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 6 Stornierung und Rücktritt</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-left font-semibold text-foreground">Zeitpunkt der Stornierung</th>
                      <th className="p-3 text-left font-semibold text-foreground">Stornogebühr</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="p-3">Mehr als 24 Stunden vor Abfahrt</td>
                      <td className="p-3">Kostenfrei</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3">Weniger als 24 Stunden vor Abfahrt</td>
                      <td className="p-3">Individueller Fahrtanteil (ohne Plattformgebühr)</td>
                    </tr>
                    <tr>
                      <td className="p-3">Nach Taxi-Buchung durch Initiator</td>
                      <td className="p-3">Voller individueller Anteil; etwaige Taxistornokosten trägt der stornierende Nutzer</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>Der Initiator kann die Fahrt kostenfrei stornieren, wenn weniger als 2 Mitfahrende bestätigt haben und die Buchungsfrist noch nicht abgelaufen ist.</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">§ 7 Haftungsausschluss</h2>
              <p>TaxiTeilen haftet nicht für:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Schäden durch das gebuchte Taxiunternehmen</li>
                <li>Verspätungen oder Ausfälle des Taxis</li>
                <li>Unrichtige Fluginformationen Dritter (Flughafen-APIs, externe Datenprovider)</li>
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
              <p>Stand: <Placeholder>[DATUM]</Placeholder></p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default AGB;
