import { Database, Brain, Code2, Zap, Sparkles, ArrowRight, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { fadeInUp, staggerContainer, cardEntrance } from "@/styles/animations";
import { useAuth } from "@/context/AuthContext";

function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gold-500/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-gold-400/10 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 shadow-md shadow-gold-500/20">
                <Database className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold">AI Data Assistant</h1>
              <Badge variant="outline" className="ml-2 border-gold-400/30 text-gold-400">
                Premium Edition
              </Badge>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sair
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 py-20 md:py-28">
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="max-w-3xl mx-auto text-center space-y-6"
        >
          <motion.div variants={fadeInUp}>
            <Badge className="bg-gold-400/10 text-gold-400 border border-gold-400/20 mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Powered by Claude AI
            </Badge>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="text-4xl md:text-6xl font-bold tracking-tight"
          >
            Query Your Database with
            <span className="block bg-gradient-to-r from-gold-400 via-gold-300 to-gold-500 bg-clip-text text-transparent">
              Natural Language
            </span>
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="text-lg text-muted-foreground max-w-xl mx-auto"
          >
            Transform complex SQL queries into simple conversations.
            Just describe what you need in plain language.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex justify-center gap-4 pt-4">
            <Link to="/dashboard">
              <Button
                size="lg"
                className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white shadow-lg shadow-gold-500/25 transition-all hover:shadow-xl hover:shadow-gold-500/30 group"
              >
                Open Dashboard
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap gap-2 justify-center pt-4"
          >
            {["TypeScript", "React", "Node.js", "Supabase", "Claude AI"].map((tech) => (
              <Badge
                key={tech}
                variant="outline"
                className="border-border/50 text-muted-foreground hover:border-gold-400/30 hover:text-gold-400 transition-colors"
              >
                {tech}
              </Badge>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative container mx-auto px-4 py-16">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
        >
          {[
            { icon: Code2, title: "Shared Types", desc: "Centralized TypeScript definitions for database entities and API contracts" },
            { icon: Zap, title: "Type-Safe Config", desc: "Environment validation with fail-fast behavior and clear error messages" },
            { icon: Database, title: "Schema Introspection", desc: "Automatic database schema discovery and metadata extraction" },
            { icon: Brain, title: "AI-Powered", desc: "Natural language query parsing using Claude or OpenAI models" },
          ].map((feature, index) => (
            <motion.div key={feature.title} variants={cardEntrance}>
              <GlassCard
                variant="elevated"
                className="h-full hover:border-gold-400/30 transition-all duration-300 group"
              >
                <CardHeader>
                  <feature.icon className="h-8 w-8 text-gold-400 mb-2 group-hover:scale-110 transition-transform" />
                  <CardTitle className="text-lg group-hover:text-gold-400 transition-colors">
                    {feature.title}
                  </CardTitle>
                  <CardDescription>
                    {feature.desc}
                  </CardDescription>
                </CardHeader>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Architecture Section */}
      <section className="relative container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-center mb-8"
          >
            <span className="bg-gradient-to-r from-gold-400 to-gold-500 bg-clip-text text-transparent">
              Monorepo Architecture
            </span>
          </motion.h3>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              { title: "@ai-assistant/shared", subtitle: "Shared Types Package", items: ["Database entity types", "Query building types", "AI interaction types", "Strict TypeScript"] },
              { title: "@ai-assistant/backend", subtitle: "Node.js Backend", items: ["Environment validation", "Configuration layer", "Schema introspection", "SQL generation"] },
              { title: "Frontend", subtitle: "React + Vite", items: ["Query interface", "Results visualization", "Schema explorer", "Query history"] },
            ].map((pkg) => (
              <motion.div key={pkg.title} variants={cardEntrance}>
                <GlassCard variant="default" className="h-full">
                  <CardHeader>
                    <CardTitle className="text-gold-400">{pkg.title}</CardTitle>
                    <CardDescription className="text-xs">{pkg.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      {pkg.items.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-gold-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Status Section */}
      <section className="relative container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <GlassCard variant="bordered" className="overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gold-400/5 to-transparent" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Infrastructure Ready
                </CardTitle>
                <CardDescription>
                  MVP Foundation Complete
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-3">
                  {[
                    { title: "TypeScript Monorepo Structure", desc: "Clean separation with shared types" },
                    { title: "Environment Validation", desc: "Fail-fast with clear error messages" },
                    { title: "Type-Safe Configuration", desc: "Single source of truth for runtime config" },
                    { title: "Zero TypeScript Errors", desc: "Strict mode enabled across all packages" },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-2">
                      <span className="text-gold-400 mt-0.5">✓</span>
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-gold-400/10 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gold-400" />
              Built with TypeScript, React, and Supabase
            </p>
            <div className="flex gap-6">
              <a href="/README.md" className="hover:text-gold-400 transition-colors">Documentation</a>
              <a href="/SETUP.md" className="hover:text-gold-400 transition-colors">Setup Guide</a>
              <a href="/ARCHITECTURE.md" className="hover:text-gold-400 transition-colors">Architecture</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;

