export type TourStep = {
  index: number;
  route: string;
  body: string;
  placement: "top" | "bottom" | "center";
  isLast?: boolean;
};

export const TOUR_STEPS: TourStep[] = [
  {
    index: 0,
    route: "/design",
    body: "This is what customers see first, when you scan a QR code or they go through your website",
    placement: "bottom"
  },
  {
    index: 1,
    route: "/pendants",
    body: "users can choose from multiple styles, or create their own (in pendants > custom)",
    placement: "top"
  },
  {
    index: 2,
    route: "/pendants",
    body: "including clarifying details to help you price the pendant later",
    placement: "top"
  },
  {
    index: 3,
    route: "/pendants",
    body: "We collect Customer information to help you reach out and market to interested leads!",
    placement: "top"
  },
  {
    index: 4,
    route: "/owner",
    body: "once the customer is done, the quote request is sent to you — you respond to it through the admin panel",
    placement: "center",
    isLast: true
  }
];

export const TOUR_STORAGE_KEY = "vvs_tour_step";
export const TOUR_STEP_EVENT = "vvs-tour-step";
