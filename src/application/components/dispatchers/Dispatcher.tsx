import {useParams} from 'react-router-dom';
import {useCurrentUser} from '../../../utils/users/use-current-user';
import Typography from '@mui/material/Typography';
import {IntellectualPropertiesMainPage} from '../../../intellectual-property-report/IntellectualPropertiesMainPage';
import {applications} from '../../../utils/applications/applications-access';
import React from 'react';
import {TimeRecordsMainPage} from '../../../intellectual-property-report/TimeRecordsMainPage';
import {IntellectualPropertyReportMainPage} from '../../../intellectual-property-report/IntellectualPropertyReportMainPage';
import {IntellectualPropertySettingsMainPage} from '../../../intellectual-property-report/IntellectualPropertySettingsMainPage';
import {useApplicationAndDomain} from '../../../utils/use-application-and-domain';
import {AccountantDispatcher} from './AccountantDispatcher';
import {CubesMainPage} from '../../../cubes/CubesMainPage';
import {CubeStatsPage} from '../../../cubes/CubeStatsPage';
import {StrengthTrainingCatalogPage} from '../../../strength-training/StrengthTrainingCatalogPage';
import {StrengthTrainingPlansPage} from '../../../strength-training/StrengthTrainingPlansPage';
import {StrengthTrainingPlanPage} from '../../../strength-training/StrengthTrainingPlanPage';

export function Dispatcher() {
    let {page, param1: planPublicId} = useParams();
    const {user} = useCurrentUser();
    const {currentApplicationId, currentDomainPublicId} = useApplicationAndDomain();
    const application = applications.get(currentApplicationId!)!;

    function isRequestForPage(pageId: string) {
        return (application?.pages.get(pageId)?.links || []).includes(page!);
    }

    if (application.id === 'ACCOUNTANT') {
        return <AccountantDispatcher />;
    } else if (application.id === 'IPR') {
        if (!page || isRequestForPage('IPR')) {
            return <IntellectualPropertiesMainPage />;
        }
        if (isRequestForPage('TIME_RECORD')) {
            return <TimeRecordsMainPage />;
        }
        if (isRequestForPage('IP_REPORTS')) {
            return <IntellectualPropertyReportMainPage />;
        }
        if (isRequestForPage('IP_SETTING')) {
            return <IntellectualPropertySettingsMainPage />;
        }
    } else if (application.id === 'HOME') {
        return <></>;
    } else if (application.id === 'CUBES') {
        if (!page || isRequestForPage('CUBE_MAIN')) {
            return <CubesMainPage></CubesMainPage>;
        }
        if (isRequestForPage('CUBE_STATS')) {
            return <CubeStatsPage />;
        }
        return <></>;
    } else if (application.id === 'STRENGTH_TRAINING') {
        if (isRequestForPage('STRENGTH_TRAINING_PLANS')) {
            if (planPublicId) {
                return <StrengthTrainingPlanPage />;
            }
            return <StrengthTrainingPlansPage />;
        }
        if (!page || isRequestForPage('EXERCISE_CATALOG')) {
            return <StrengthTrainingCatalogPage />;
        }
        return <></>;
    }
    return (
        <Typography>
            {application.id} home{' '}
            {user!.user.domains.find(domain => domain.publicId === currentDomainPublicId)?.name || ''}
        </Typography>
    );
}
