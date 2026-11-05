// Official AWS Architecture Icons, unmodified (see src/assets/aws-icons/README.md). `?url` gives a
// file URL, so they load as <img> from 'self' and need nothing from the CSP.
import awsCloud from '../assets/aws-icons/aws-cloud.svg?url';
import awsCloudDark from '../assets/aws-icons/aws-cloud-dark.svg?url';
import autoScalingGroup from '../assets/aws-icons/auto-scaling-group.svg?url';
import cloudwatch from '../assets/aws-icons/cloudwatch.svg?url';
import ec2 from '../assets/aws-icons/ec2.svg?url';
import ecr from '../assets/aws-icons/ecr.svg?url';
import eks from '../assets/aws-icons/eks.svg?url';
import elb from '../assets/aws-icons/elastic-load-balancing.svg?url';
import fargate from '../assets/aws-icons/fargate.svg?url';
import elasticache from '../assets/aws-icons/elasticache.svg?url';
import guardduty from '../assets/aws-icons/guardduty.svg?url';
import rds from '../assets/aws-icons/rds.svg?url';
import route53 from '../assets/aws-icons/route-53.svg?url';
import s3 from '../assets/aws-icons/s3.svg?url';
import ses from '../assets/aws-icons/ses.svg?url';
import sns from '../assets/aws-icons/sns.svg?url';

export const icons = {
  cloudwatch,
  ec2,
  ecr,
  eks,
  elasticache,
  elb,
  fargate,
  guardduty,
  rds,
  route53,
  s3,
  ses,
  sns,
};
export const cloudIcon = { light: awsCloud, dark: awsCloudDark };
export const groupIcons = { autoScalingGroup };
