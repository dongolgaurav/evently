import hero from "@/public/images/hero.webp";
import auth from "@/public/images/auth.webp";
import tech from "@/public/images/cat-tech.webp";
import social from "@/public/images/cat-social.webp";
import career from "@/public/images/cat-career.webp";
import workshop from "@/public/images/cat-workshop.webp";
import fundraiser from "@/public/images/cat-fundraiser.webp";

/** AI-generated illustrations (gpt-image-2), one style across the product. */
export const IMAGES = { hero, auth };

export const CATEGORY_IMAGES: Record<string, typeof hero> = {
  "Academic/Tech": tech,
  Social: social,
  Career: career,
  Workshop: workshop,
  Fundraiser: fundraiser,
};

export const categoryImage = (category: string) => CATEGORY_IMAGES[category] ?? social;
