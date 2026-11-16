import { PartnersService } from '../services/partners.service.js';

export class PartnersController {
  static async getPartnersDashboard(req, res, next) {
    try {
      const data = await PartnersService.getPartnersDashboard();
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
}

export default PartnersController;
