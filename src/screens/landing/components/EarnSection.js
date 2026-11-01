import { View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../../../context/LanguageContext';
import { EARN_ITEMS } from '../constants';
import InfoRow from './InfoRow';

// "Daromad qanday shakllanadi": narx, komissiya tartibi va pulni yechib olish.
export default function EarnSection() {
  const { t } = useLanguage();

  return (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      {EARN_ITEMS.map((e) => (
        <InfoRow
          key={e.key}
          card
          accent={e.color}
          badge={<MaterialCommunityIcons name={e.icon} size={24} color={e.color} />}
          title={t(`ustaLanding.earn.${e.key}Title`)}
          description={t(`ustaLanding.earn.${e.key}Desc`)}
        />
      ))}
    </View>
  );
}
