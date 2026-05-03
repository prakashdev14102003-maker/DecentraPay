import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="text-xl font-semibold tracking-tight">DecentraPay</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-8 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Built on Ethereum Sepolia
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              Track, Verify &{" "}
              <span className="text-emerald-400">Trade</span>{" "}
              Carbon Credits
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              A verified sector-based carbon-credit registry and marketplace.
              Submit your emissions data, get it verified, earn carbon credits,
              and trade them on-chain with full transparency.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 text-base">
                  Register Your Company
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="px-8 h-12 text-base">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From emission reporting to carbon credit trading — all in one platform.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Submit Emissions",
                desc: "Report your monthly activity data across Scope 1, 2, and 3. Our EPA-aligned calculation engine computes your CO₂e footprint.",
                icon: "📊",
              },
              {
                step: "02",
                title: "Get Verified",
                desc: "Upload your audit report. Verified through a structured lifecycle with SHA-256 hashing anchored on Ethereum for tamper-proof records.",
                icon: "✅",
              },
              {
                step: "03",
                title: "Trade Credits",
                desc: "Earn surplus credits or cover deficits in our order-book marketplace. On-chain settlement with 10% royalty to original issuers.",
                icon: "🔄",
              },
            ].map((f) => (
              <div
                key={f.step}
                className="group relative p-8 rounded-xl border border-border/60 bg-card hover:border-emerald-500/40 transition-all duration-300"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <div className="text-xs font-mono text-emerald-500 mb-2">{f.step}</div>
                <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Supported Sectors</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Sector-specific emission factors from the EPA GHG Emission Factors Hub 2025.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Energy",
                desc: "Natural gas, coal, petroleum — stationary and mobile combustion across all fuel types.",
                color: "from-amber-500/20 to-amber-600/5",
                icon: "⚡",
              },
              {
                name: "Technology",
                desc: "Data centers, refrigerants, cloud computing, employee commuting — full tech stack emissions.",
                color: "from-blue-500/20 to-blue-600/5",
                icon: "💻",
              },
              {
                name: "Agriculture",
                desc: "Fertilizers, enteric fermentation, manure management, rice cultivation, farm equipment.",
                color: "from-green-500/20 to-green-600/5",
                icon: "🌾",
              },
            ].map((s) => (
              <div
                key={s.name}
                className={`p-8 rounded-xl bg-gradient-to-b ${s.color} border border-border/40`}
              >
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{s.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "40+", label: "Activity Types" },
              { value: "3", label: "Sectors" },
              { value: "Scope 1-3", label: "Coverage" },
              { value: "On-chain", label: "Verification" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-emerald-400 mb-1">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">D</span>
            </div>
            <span className="text-sm font-medium">DecentraPay</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 DecentraPay. Carbon credit registry on Ethereum Sepolia.
          </p>
        </div>
      </footer>
    </div>
  );
}
