import type { Localized } from "../types";

interface RestaurantConfig {
  restaurantName: string;
  /** Optional asset path relative to public/, so all hosts and offline work. */
  logo?: string;
  restaurantMomentEnabled: boolean;
  restaurantMomentTitle: Localized;
  restaurantMomentText: Localized;
  rewardName: Localized;
}

export const restaurant: RestaurantConfig = {
  restaurantName: "TableQuest",
  restaurantMomentEnabled: false,
  restaurantMomentTitle: {
    ru: "Момент от ресторана",
    kk: "Мейрамхана ұсынған сәт",
    en: "Restaurant Moment",
  },
  restaurantMomentText: {
    ru: "В реальном заведении здесь может появиться комплимент или специальное предложение для вашей компании.",
    kk: "Нақты мейрамханада осы жерде сіздерге арналған сый немесе арнайы ұсыныс болуы мүмкін.",
    en: "At a real restaurant, a complimentary treat or a special offer for your group could appear here.",
  },
  rewardName: {
    ru: "Десерт-сюрприз",
    kk: "Тосын десерт",
    en: "Dessert Surprise",
  },
};
