import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageMain } from "@/components/layout/PageMain";
import { PushOptIn } from "@/components/push/PushOptIn";
import { PushSourcePreferences } from "@/components/push/PushSourcePreferences";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NEWS_SOURCES, REGION_LABELS } from "@/lib/sources";
import { SourcePreferences } from "@/components/settings/SourcePreferences";

export default function SettingsPage() {
  return (
    <>
      <AppHeader />
      <PageMain>
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Terug naar headlines
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          Instellingen
        </h1>

        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weergave</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Donkere of lichte modus
              </p>
              <ThemeToggle />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meldingen</CardTitle>
            </CardHeader>
            <CardContent>
              <PushOptIn />
              <PushSourcePreferences sources={NEWS_SOURCES} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bronnen</CardTitle>
            </CardHeader>
            <CardContent>
              <SourcePreferences sources={NEWS_SOURCES} />
              <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                {NEWS_SOURCES.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <Link
                      href={`/bron/${s.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {s.name}
                    </Link>
                    <span>{REGION_LABELS[s.region]}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </PageMain>
    </>
  );
}
