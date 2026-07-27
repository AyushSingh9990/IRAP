import JourneyPage from '../../components/public/JourneyPage/JourneyPage.jsx';
import { journeyContent } from '../../config/publicContent.js';

function OrganizationsPage() {
  return <JourneyPage config={journeyContent.organization} />;
}

export default OrganizationsPage;
