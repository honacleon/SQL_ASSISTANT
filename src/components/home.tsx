import { Database, Brain, Code2, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">AI Data Assistant</h1>
            <Badge variant="secondary" className="ml-2">MVP Foundation</Badge>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Query Your Database with
            <span className="text-primary"> Natural Language</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            A TypeScript monorepo foundation for an AI-powered data assistant. 
            Convert plain language queries into SQL using Claude or OpenAI.
          </p>
          <div className="flex justify-center pt-2">
            <Link to="/dashboard">
              <Button size="lg">Open Dashboard</Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 justify-center pt-4">
            <Badge variant="outline">TypeScript</Badge>
            <Badge variant="outline">React</Badge>
            <Badge variant="outline">Node.js</Badge>
            <Badge variant="outline">Supabase</Badge>
            <Badge variant="outline">Claude AI</Badge>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <Code2 className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Shared Types</CardTitle>
              <CardDescription>
                Centralized TypeScript definitions for database entities and API contracts
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Type-Safe Config</CardTitle>
              <CardDescription>
                Environment validation with fail-fast behavior and clear error messages
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Database className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Schema Introspection</CardTitle>
              <CardDescription>
                Automatic database schema discovery and metadata extraction
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Brain className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">AI-Powered</CardTitle>
              <CardDescription>
                Natural language query parsing using Claude or OpenAI models
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">Monorepo Architecture</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>@ai-assistant/shared</CardTitle>
                <CardDescription className="text-xs">Shared Types Package</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Database entity types</li>
                  <li>• Query building types</li>
                  <li>• AI interaction types</li>
                  <li>• Strict TypeScript</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>@ai-assistant/backend</CardTitle>
                <CardDescription className="text-xs">Node.js Backend</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Environment validation</li>
                  <li>• Configuration layer</li>
                  <li>• Schema introspection</li>
                  <li>• SQL generation</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Frontend</CardTitle>
                <CardDescription className="text-xs">React + Vite</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Query interface</li>
                  <li>• Results visualization</li>
                  <li>• Schema explorer</li>
                  <li>• Query history</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Status Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-500" />
                Infrastructure Ready
              </CardTitle>
              <CardDescription>
                MVP Foundation (Phase 1) Complete
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <div>
                    <p className="font-medium text-sm">TypeScript Monorepo Structure</p>
                    <p className="text-xs text-muted-foreground">Clean separation with shared types</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <div>
                    <p className="font-medium text-sm">Environment Validation</p>
                    <p className="text-xs text-muted-foreground">Fail-fast with clear error messages</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <div>
                    <p className="font-medium text-sm">Type-Safe Configuration</p>
                    <p className="text-xs text-muted-foreground">Single source of truth for runtime config</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <div>
                    <p className="font-medium text-sm">Zero TypeScript Errors</p>
                    <p className="text-xs text-muted-foreground">Strict mode enabled across all packages</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Next Steps */}
      <section className="container mx-auto px-4 py-12 pb-20">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-6">Next Steps</h3>
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Phase 2: Core Functionality</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Schema introspection service, AI query parser, SQL generation engine, and API endpoints
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Phase 3: User Interface</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Query input component, results table, schema explorer, and query history
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Phase 4: Advanced Features</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Query suggestions, visual query builder, export functionality, and saved queries
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>Built with TypeScript, React, and Supabase</p>
            <div className="flex gap-4">
              <a href="/README.md" className="hover:text-foreground transition-colors">Documentation</a>
              <a href="/SETUP.md" className="hover:text-foreground transition-colors">Setup Guide</a>
              <a href="/ARCHITECTURE.md" className="hover:text-foreground transition-colors">Architecture</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
