import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";

const Impressum = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 px-4 py-12">
        <article className="mx-auto max-w-[720px] space-y-8">
          <header className="space-y-3">
            <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Impressum
            </h1>
            <Badge variant="outline" className="text-muted-foreground">
              Angaben gemäß § 5 TMG
            </Badge>
          </header>

          <section className="space-y-2">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Angaben gemäß § 5 TMG
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Snohomish Capital UG (haftungsbeschränkt)<br />
              Geschäftsführer: Nikolas Noetzel
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Handelsregister
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              HRB 242039, Amtsgericht München
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Kontakt
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Telefon: <span className="rounded bg-primary/30 px-1 py-0.5 font-semibold">089 123456789</span><br />
              E-Mail: <span className="rounded bg-primary/30 px-1 py-0.5 font-semibold">info@taxiteilen.de</span>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Nikolas Noetzel<br />
              Snohomish Capital UG (haftungsbeschränkt)
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Streitschlichtung
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
              . Unsere E-Mail-Adresse finden Sie oben im Impressum. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Haftung für Inhalte
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Haftung für Links
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Urheberrecht
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default Impressum;
