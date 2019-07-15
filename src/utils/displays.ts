import logger from '../lib/utils/logger';
import { graphics } from 'systeminformation';

/** Get list of displays connected to the computer */
export async function getDisplays() {
    //Get list of monitors to allow users to select one for the player
    const data = await graphics();
    logger.debug('[Webapp] Displays detected : ' + JSON.stringify(data.displays));
    return data.displays
		.filter(d => d.resolutionx > 0)
		.map(d => {
		  d.model = d.model.replace('�', 'e');
	  	  return d;
		});
  }