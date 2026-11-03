import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/api/query-client";
import { storefrontApi, useStorefront } from "../../../lib/storefront";
import { sectionContent } from "../../../lib/storefront/sections";
import {
  useStorefrontServices,
  useStorefrontTeam,
} from "../../../lib/storefront/use-storefront-catalog";
import { StorefrontPage } from "../StorefrontPage";
import { StorefrontOpeningHours } from '../StorefrontOpeningHours'

/**
 * About the business, built only from what the public profile actually carries:
 * its description, category and location, plus a stats band whose every number
 * is counted from real records.
 *
 * The band is the design's dark stat strip. It shows only the counts it can
 * compute: a business with no published services shows two tiles, not a
 * "0 services" tile. The rating is requested only when the business actually
 * exposes reviews, so a business without that module never pays for the call.
 */
export function AboutPage() {
  const { business, businessId, landingPage, can } = useStorefront();
  const { title, description } = sectionContent(landingPage, "about");

  const services = useStorefrontServices(businessId, can("services"));
  const team = useStorefrontTeam(businessId);
  const showsReviews = can("galleryReviews");

  const summary = useQuery({
    queryKey: [...queryKeys.storefront(businessId), "review-summary"] as const,
    queryFn: () => storefrontApi.reviewSummary(businessId),
    enabled: showsReviews,
    retry: false,
  });

  const memberCount = (team.data ?? []).length;
  const stats: { value: string; label: string }[] = [];
  if (services.services.length > 0) {
    stats.push({
      value: String(services.services.length),
      label: services.services.length === 1 ? "Service" : "Services",
    });
  }
  if (memberCount > 0) {
    stats.push({
      value: String(memberCount),
      label: memberCount === 1 ? "Specialist" : "Specialists",
    });
  }
  if (summary.data && summary.data.totalCount > 0) {
    stats.push({
      value: summary.data.averageRating.toFixed(1),
      label: `from ${summary.data.totalCount} review${summary.data.totalCount === 1 ? "" : "s"}`,
    });
  }

  const fallback = `${business.name} is a ${business.category.toLowerCase()}${
    business.location ? ` in ${business.location}` : ""
  }, listed on Punched.`;

  return (
    <StorefrontPage
      eyebrow="About us"
      title={title || `About ${business.name}`}
      description={description ?? undefined}
    >
      <div className="sf-detail">
        <p className="text-body leading-relaxed text-muted">
          {business.description || fallback}
        </p>

        <dl className="sf-facts m-0">
          <div>
            <dt>Category</dt>
            <dd>{business.category || "—"}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{business.location || "—"}</dd>
          </div>
          <div>
            <dt>Booking</dt>
            <dd>{can("appointments") ? "Online" : "By arrangement"}</dd>
          </div>
        </dl>
      </div>

      {stats.length > 0 ? (
        <div className="sf-premium mt-[1.4rem]">
          <div className="sf-stats">
            {stats.map((stat) => (
              <div key={stat.label}>
                <b>{stat.value}</b>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-[0.5rem]">
        <p className="eyebrow">Opening hours</p>
        <StorefrontOpeningHours variant="footer" />
      </div>
    </StorefrontPage>
  );
}
