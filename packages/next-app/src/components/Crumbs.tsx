import { Separator } from "@radix-ui/react-separator";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "./ui/breadcrumb";
import { SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { cn } from "@/lib/utils";

export interface CrumbItems {
  collapsible?: boolean; // default true
  href: string;
  title: string;
}

export function Crumbs ({value: crumbs} : {value: CrumbItems[]}) {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map(({collapsible = true, href, title}, index) => (
              <div className="flex flex-row items-center" key={href}>
                <BreadcrumbItem className={cn(collapsible ? "hidden md:block" : "")}>
                  <BreadcrumbLink href={href}>
                    {title}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {index !== crumbs.length - 1 && <BreadcrumbSeparator className="ml-3 hidden md:block" />}
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </header>
    </SidebarInset>
  );
}
