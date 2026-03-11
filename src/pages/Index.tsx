import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import RouteSelector from "@/components/RouteSelector";
import CostCalculator from "@/components/CostCalculator";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <HeroSection />
      <RouteSelector />
      <HowItWorks />
      <CostCalculator />
      <Footer />
    </div>
  );
};

export default Index;
