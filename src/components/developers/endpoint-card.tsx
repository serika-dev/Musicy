import { type Endpoint, snippets } from "@/lib/developer-docs";
import { CodeBlock } from "./code-block";
import { AuthBadge, MethodBadge, ParamTable } from "./docs-ui";

/** One endpoint: prose and parameters on the left, request / response on the right. */
export function EndpointCard({
  endpoint: ep,
  baseUrl,
}: {
  endpoint: Endpoint;
  baseUrl: string;
}) {
  const s = snippets(baseUrl, ep);
  return (
    <section
      id={ep.id}
      className="scroll-mt-24 border-t border-border pt-10 first:border-t-0 first:pt-0"
    >
      <div className="grid gap-8 2xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        <div className="min-w-0 space-y-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              <a
                href={`#${ep.id}`}
                className="hover:underline underline-offset-4"
              >
                {ep.title}
              </a>
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <MethodBadge method={ep.method} />
              <code className="break-all font-mono text-[13px] text-foreground">
                {ep.path}
              </code>
              <AuthBadge auth={ep.auth} />
            </div>
            <p className="mt-3 leading-relaxed text-foreground/85">
              {ep.description}
            </p>
          </div>
          {ep.pathParams?.length ? (
            <ParamTable title="Path parameters" params={ep.pathParams} />
          ) : null}
          {ep.query?.length ? (
            <ParamTable title="Query parameters" params={ep.query} />
          ) : null}
          {ep.body?.length ? (
            <ParamTable title="JSON body" params={ep.body} />
          ) : null}
          {ep.notes?.map((n) => (
            <p key={n} className="text-sm text-muted-foreground">
              {n}
            </p>
          ))}
        </div>
        <div className="min-w-0 space-y-3">
          <CodeBlock
            tabs={[
              { label: "cURL", code: s.curl },
              { label: "JavaScript", code: s.js },
              { label: "Python", code: s.py },
            ]}
          />
          <CodeBlock
            title="Response"
            tabs={[{ label: "Response", code: ep.response }]}
          />
        </div>
      </div>
    </section>
  );
}
