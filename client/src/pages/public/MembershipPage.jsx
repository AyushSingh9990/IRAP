import JourneyPage from '../../components/public/JourneyPage/JourneyPage.jsx';
import { journeyContent } from '../../config/publicContent.js';

function MembershipPage() {
  return <JourneyPage config={journeyContent.member} />;
}

export default MembershipPage;
