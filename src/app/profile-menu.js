import ProfileMenuScreen from '../worker/screens/ProfileMenuScreen';
import SlideScreen from '../worker/components/SlideScreen';

export default function Route() {
  return (
    <SlideScreen from="right">
      <ProfileMenuScreen />
    </SlideScreen>
  );
}
