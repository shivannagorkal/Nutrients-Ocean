import { MetaService } from '../services/meta.service.js';

export class MetaController {
  static async getMetadata(req, res, next) {
    try {
      const data = await MetaService.getMetadata();
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
}

export default MetaController;
