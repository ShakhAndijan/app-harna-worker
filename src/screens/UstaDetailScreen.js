import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import { UstaStyleProvider, useUstaStyles } from './usta-detail/styles';
import useUstaDetail from './usta-detail/hooks/useUstaDetail';
import useUstaPublic from './usta-detail/hooks/useUstaPublic';
import AvailabilitySection from './usta-detail/components/AvailabilitySection';
import usePullRefresh from '../hooks/usePullRefresh';
import useLivePresence from '../hooks/useLivePresence';
import { track } from '../utils/analytics';
import { pickProfile, buildBadges, buildStatItems, buildSchedule } from './usta-detail/derive';
import DetailHeader from './usta-detail/components/DetailHeader';
import ProfileHero from './usta-detail/components/ProfileHero';
import StatCards from './usta-detail/components/StatCards';
import BadgeRow from './usta-detail/components/BadgeRow';
import TrustSection from './usta-detail/components/TrustSection';
import LanguagesSection from './usta-detail/components/LanguagesSection';
import SpecializationSection from './usta-detail/components/SpecializationSection';
import ServicePricesSection from './usta-detail/components/ServicePricesSection';
import ScheduleSection from './usta-detail/components/ScheduleSection';
import CertificatesSection from './usta-detail/components/CertificatesSection';
import WorksSection from './usta-detail/components/WorksSection';
import ListingsSection from './usta-detail/components/ListingsSection';
import RatingSection from './usta-detail/components/RatingSection';
import ReviewsSection from './usta-detail/components/ReviewsSection';
import ComplaintsSection from './usta-detail/components/ComplaintsSection';
import BottomCta from './usta-detail/components/BottomCta';

// Usta profili ekrani. Har bir bo'lim `usta-detail/components/` ichida alohida komponent;
// ma'lumot `hooks/useUstaDetail`, hisob-kitoblar `derive.js` da.
export default function UstaDetailScreen(props) {
  return (
    <UstaStyleProvider>
      <UstaDetailContent {...props} />
    </UstaStyleProvider>
  );
}

function UstaDetailContent({
  usta,
  onBack,
  onGoToLogin,
  onOrderWorker,
  onSelectWork,
  onReport,
  isLoggedIn = false,
}) {
  const insets = useSafeAreaInsets();
  const { refreshControl } = usePullRefresh();
  const { t: tr } = useLanguage();
  const { C, st } = useUstaStyles();

  const [reviewFilter, setReviewFilter] = useState('all');

  const {
    detail,
    loadingDetail,
    certificates,
    loadingCertificates,
    selectedCategoryId,
    setSelectedCategoryId,
    liked,
    toggleLike,
  } = useUstaDetail(usta);

  const profile = pickProfile({ detail, usta, C, tr });
  const { d, initial, name, trade, rating, rawRating, bgColor, location, experience, bio } =
    profile;

  const presence = useLivePresence(usta?.id ?? d?.id);
  const router = useRouter();
  const viewedId = usta?.id;
  useEffect(() => {
    if (viewedId != null) track('worker_viewed');
  }, [viewedId]);
  const pub = useUstaPublic(usta?.id ?? detail?.id);

  const categories = detail?.categories || [];
  // Bajarilgan ishlar va ommaviy sharhlar — serverning alohida endpointlaridan; kelmaguncha
  // yoki bo'sh bo'lsa profildagi portfolio ishlatiladi.
  const profilePortfolio = detail?.portfolio || [];
  const jobs = pub.jobs.map((j) => ({
    id: j.public_token,
    token: j.public_token,
    title: j.category?.name ?? '',
    photo: j.after_photos?.[0] ?? j.before_photos?.[0] ?? null,
    rating: j.rating ?? null,
    workDate: j.completed_at ?? null,
  }));
  const portfolio = jobs.length ? jobs : profilePortfolio;
  const publicReviews = pub.reviews.map((r, i) => ({
    id: `${r.created_at}-${i}`,
    title: [r.customer?.full_name, r.category?.name].filter(Boolean).join(' · '),
    workDate: r.created_at,
    rating: r.rating,
    comment: r.comment,
    photos: r.photos ?? [],
  }));
  const reviewItems = publicReviews.length
    ? publicReviews
    : profilePortfolio.filter((p) => p.comment || p.rating != null);
  const { weekDays, workHours, offDates } = buildSchedule(detail?.schedule || null);

  const handleOrderThisWorker = () => {
    const workerId = usta?.id ?? detail?.id;
    if (!workerId) return;
    onOrderWorker?.({
      id: workerId,
      name,
      trade,
      bgColor,
      initial,
      categoryId: selectedCategoryId ?? detail?.mainCategoryId ?? null,
    });
  };

  return (
    <SafeAreaView style={st.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      <DetailHeader
        onBack={onBack}
        workerId={usta?.id ?? detail?.id}
        shareInfo={{ name, trade, rating }}
        isLoggedIn={isLoggedIn}
        liked={liked}
        onToggleLike={toggleLike}
        onReport={onReport ? () => onReport({ id: usta?.id ?? detail?.id, name }) : undefined}
      />

      <ScrollView
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 14) + 76 }}
      >
        <View style={st.pad}>
          <ProfileHero
            initial={initial}
            name={name}
            trade={trade}
            location={location}
            rating={rating}
            bgColor={bgColor}
            photo={d.profile_photo}
            bio={bio}
            isOnline={presence ? presence.is_online : profile.isOnline}
            availability={presence?.availability}
            isIdentityVerified={!!detail?.isIdentityVerified}
            avgResponseMin={detail?.avgResponseMin}
            showLoader={loadingDetail && !detail}
          />
          <StatCards items={buildStatItems({ d, experience, detail, portfolio, tr, C })} />
          <BadgeRow badges={buildBadges(d, tr, C)} />
          <TrustSection detail={detail} />
          <LanguagesSection languages={profile.languages} />
          <SpecializationSection
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            loading={loadingDetail}
          />
          <ServicePricesSection
            categories={categories}
            selectedId={selectedCategoryId}
            loading={loadingDetail}
          />
          {isLoggedIn && (
            <ScheduleSection weekDays={weekDays} workHours={workHours} offDates={offDates} />
          )}
          <AvailabilitySection availability={pub.availability} />
          <CertificatesSection certificates={certificates} loading={loadingCertificates} />
        </View>

        <WorksSection
          portfolio={portfolio}
          loading={loadingDetail || pub.jobsLoading}
          onSelectWork={(work) =>
            work.token
              ? router.push(`/job/${encodeURIComponent(work.token)}`)
              : onSelectWork?.({ ...work, worker: name })
          }
        />

        <ListingsSection workerId={usta?.id ?? detail?.id} />

        <View style={st.pad}>
          <RatingSection
            rating={rating}
            rawRating={rawRating}
            reviewCount={detail?.reviewCount ?? 0}
            reviewItemsCount={reviewItems.length}
            ratingBreakdown={detail?.ratingBreakdown ?? null}
          />
          <ReviewsSection
            reviewItems={reviewItems}
            filter={reviewFilter}
            onFilterChange={setReviewFilter}
            onLoadMore={publicReviews.length ? pub.reviewsMore : null}
            loadingMore={pub.reviewsFetching}
          />
          <ComplaintsSection workerId={usta?.id ?? detail?.id} />
        </View>
      </ScrollView>

      <BottomCta
        price={profile.startingPrice}
        onPress={isLoggedIn ? handleOrderThisWorker : onGoToLogin}
      />
    </SafeAreaView>
  );
}
