import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';
import { DarkScope } from '../context/ThemeContext';
import LandingHeader from './landing/components/LandingHeader';
import PromoBanner from './landing/components/PromoBanner';
import TrustRow from './landing/components/TrustRow';
import ServiceCategories from './landing/components/ServiceCategories';
import FeatureGrid from './landing/components/FeatureGrid';
import EarnSection from './landing/components/EarnSection';
import BonusCard from './landing/components/BonusCard';
import LevelsSection from './landing/components/LevelsSection';
import ReferralCard from './landing/components/ReferralCard';
import CompareSection from './landing/components/CompareSection';
import OrderPreview from './landing/components/OrderPreview';
import SectionHead from './landing/components/SectionHead';
import HowItWorks from './landing/components/HowItWorks';
import Benefits from './landing/components/Benefits';
import ClosingCta from './landing/components/ClosingCta';
import useTabBarSpace from '../navigation/useTabBarSpace';

// Kirmagan usta uchun bosh sahifa: usta bo'lib ishlashga chorlaydi. Hamma tugma kirish /
// ro'yxatdan o'tish oynasiga olib boradi. Har bir bo'lim `landing/components/` da.
export default function LandingScreen({ onLogin }) {
  const bottomSpace = useTabBarSpace(110);
  const { t } = useLanguage();

  return (
    <DarkScope>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomSpace }}
        >
          <LandingHeader onLogin={onLogin} />

          <PromoBanner onPress={onLogin} />
          <TrustRow />
          <BonusCard />

          <SectionHead title={t('ustaLanding.sec.compare')} />
          <CompareSection />

          <SectionHead title={t('ustaLanding.sec.preview')} />
          <OrderPreview onPress={onLogin} />

          <ServiceCategories />

          <SectionHead title={t('ustaLanding.sectionHead.howItWorks')} />
          <HowItWorks />

          <SectionHead title={t('ustaLanding.sectionHead.whyHarna')} />
          <Benefits />

          <SectionHead title={t('ustaLanding.sec.levels')} />
          <LevelsSection />

          <SectionHead title={t('ustaLanding.sec.features')} />
          <FeatureGrid />

          <SectionHead title={t('ustaLanding.sec.earn')} />
          <EarnSection />

          <ReferralCard />

          <ClosingCta onPress={onLogin} />
        </ScrollView>
      </SafeAreaView>
    </DarkScope>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
});
