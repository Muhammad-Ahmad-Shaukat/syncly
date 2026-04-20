import express from 'express';

import { userService } from './user-service.js';

import userValidation from './user-routes-validator.js';



const router = express.Router();



/**

 * @openapi

 * tags:

 *   - name: Users

 *     description: User accounts, tiers, and admin operations

 * components:

 *   schemas:

 *     UserPublic:

 *       type: object

 *       properties:

 *         id: { type: integer, example: 1 }

 *         username: { type: string, example: "johndoe" }

 *         email: { type: string, format: email }

 *         is_active: { type: boolean }

 *         tierType: { type: string, enum: [basic, pro, extreme] }

 *         last_login: { type: string, format: date-time, nullable: true }

 *         created_at: { type: string, format: date-time }

 *         updated_at: { type: string, format: date-time }

 *     CreateUserBody:

 *       type: object

 *       required: [username, email, password]

 *       properties:

 *         username:

 *           type: string

 *           minLength: 3

 *           maxLength: 50

 *           pattern: '^[a-zA-Z0-9]+$'

 *         email: { type: string, format: email }

 *         password:

 *           type: string

 *           minLength: 8

 *           description: Must include upper, lower, digit, and special (@$!%*?&)

 *         tierType:

 *           type: string

 *           enum: [basic, pro, extreme]

 *           default: basic

 *     UpdateUserBody:

 *       type: object

 *       properties:

 *         username:

 *           type: string

 *           minLength: 3

 *           maxLength: 50

 *         email: { type: string, format: email }

 *         tierType: { type: string, enum: [basic, pro, extreme] }

 *         is_active: { type: boolean }

 *     ChangePasswordBody:

 *       type: object

 *       required: [oldPassword, newPassword]

 *       properties:

 *         oldPassword: { type: string }

 *         newPassword:

 *           type: string

 *           minLength: 8

 *     TierBody:

 *       type: object

 *       required: [tierType]

 *       properties:

 *         tierType: { type: string, enum: [basic, pro, extreme] }

 *     BulkDeleteBody:

 *       type: object

 *       required: [userIds]

 *       properties:

 *         userIds:

 *           type: array

 *           items: { type: integer }

 *     ApiSuccessUser:

 *       type: object

 *       properties:

 *         success: { type: boolean, example: true }

 *         message: { type: string }

 *         data:

 *           $ref: '#/components/schemas/UserPublic'

 *     ApiSuccessUsersList:

 *       type: object

 *       properties:

 *         success: { type: boolean, example: true }

 *         data:

 *           type: object

 *           properties:

 *             total: { type: integer }

 *             page: { type: integer }

 *             totalPages: { type: integer }

 *             users:

 *               type: array

 *               items:

 *                 $ref: '#/components/schemas/UserPublic'

 *     ApiSuccessMessage:

 *       type: object

 *       properties:

 *         success: { type: boolean, example: true }

 *         message: { type: string }

 *     ApiError:

 *       type: object

 *       properties:

 *         success: { type: boolean, example: false }

 *         error: { type: string }

 *     ValidationError:

 *       type: object

 *       properties:

 *         error: { type: string, description: Joi validation message }

 *     UserStats:

 *       type: object

 *       properties:

 *         total: { type: integer }

 *         active: { type: integer }

 *         inactive: { type: integer }

 *         tierStats:

 *           type: object

 *           properties:

 *             basic: { type: integer }

 *             pro: { type: integer }

 *             extreme: { type: integer }

 */



/**

 * @openapi

 * /api/users/users:

 *   post:

 *     tags: [Users]

 *     summary: Create user

 *     requestBody:

 *       required: true

 *       content:

 *         application/json:

 *           schema:

 *             $ref: '#/components/schemas/CreateUserBody'

 *     responses:

 *       201:

 *         description: Created

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiSuccessUser'

 *       400:

 *         description: Validation or business error

 *         content:

 *           application/json:

 *             schema:

 *               oneOf:

 *                 - $ref: '#/components/schemas/ApiError'

 *                 - $ref: '#/components/schemas/ValidationError'

 */

router.post('/users', userValidation.createUser, async (req, res) => {

    try {

        const user = await userService.createUser(req.body);

        res.status(201).json({

            success: true,

            message: 'User created successfully',

            data: user

        });

    } catch (error) {

        res.status(400).json({

            success: false,

            error: error.message

        });

    }

});



router.post('/users/login', userValidation.login, async (req, res) => {

    try {

        const user = await userService.authenticate(req.body.email, req.body.password);

        res.json({

            success: true,

            message: 'Signed in successfully',

            data: user

        });

    } catch (error) {

        const status = error.message === 'Invalid email or password' ? 401 : 400;

        res.status(status).json({

            success: false,

            error: error.message

        });

    }

});



/**

 * @openapi

 * /api/users/users:

 *   get:

 *     tags: [Users]

 *     summary: List users (paginated)

 *     parameters:

 *       - in: query

 *         name: page

 *         schema: { type: integer, default: 1, minimum: 1 }

 *       - in: query

 *         name: limit

 *         schema: { type: integer, default: 10, minimum: 1 }

 *       - in: query

 *         name: is_active

 *         schema: { type: boolean }

 *         description: Filter by active flag

 *       - in: query

 *         name: tierType

 *         schema: { type: string, enum: [basic, pro, extreme] }

 *       - in: query

 *         name: search

 *         schema: { type: string }

 *         description: Search username or email (partial match)

 *     responses:

 *       200:

 *         description: OK

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiSuccessUsersList'

 *       500:

 *         description: Server error

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiError'

 */

router.get('/users', async (req, res) => {

    try {

        const { page = 1, limit = 10, is_active, tierType, search } = req.query;

        const result = await userService.getAllUsers(

            parseInt(page), 

            parseInt(limit), 

            { is_active, tierType, search }

        );

        res.json({

            success: true,

            data: result

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            error: error.message

        });

    }

});



/**

 * @openapi

 * /api/users/users/{id}:

 *   get:

 *     tags: [Users]

 *     summary: Get user by ID

 *     parameters:

 *       - in: path

 *         name: id

 *         required: true

 *         schema: { type: integer, minimum: 1 }

 *     responses:

 *       200:

 *         description: OK

 *         content:

 *           application/json:

 *             schema:

 *               type: object

 *               properties:

 *                 success: { type: boolean, example: true }

 *                 data:

 *                   $ref: '#/components/schemas/UserPublic'

 *       400:

 *         description: Invalid ID

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ValidationError'

 *       404:

 *         description: Not found

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiError'

 */

router.get('/users/:id', userValidation.idParam, async (req, res) => {

    try {

        const user = await userService.getUserById(req.params.id);

        res.json({

            success: true,

            data: user

        });

    } catch (error) {

        res.status(404).json({

            success: false,

            error: error.message

        });

    }

});



/**

 * @openapi

 * /api/users/users/{id}:

 *   put:

 *     tags: [Users]

 *     summary: Update user

 *     parameters:

 *       - in: path

 *         name: id

 *         required: true

 *         schema: { type: integer, minimum: 1 }

 *     requestBody:

 *       required: true

 *       content:

 *         application/json:

 *           schema:

 *             $ref: '#/components/schemas/UpdateUserBody'

 *     responses:

 *       200:

 *         description: OK

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiSuccessUser'

 *       400:

 *         description: Validation or update error

 *       404:

 *         description: User not found

 */

router.put('/users/:id', userValidation.idParam, userValidation.updateUser, async (req, res) => {

    try {

        const user = await userService.updateUser(req.params.id, req.body);

        res.json({

            success: true,

            message: 'User updated successfully',

            data: user

        });

    } catch (error) {

        res.status(400).json({

            success: false,

            error: error.message

        });

    }

});



/**

 * @openapi

 * /api/users/users/{id}:

 *   delete:

 *     tags: [Users]

 *     summary: Delete or deactivate user

 *     parameters:

 *       - in: path

 *         name: id

 *         required: true

 *         schema: { type: integer, minimum: 1 }

 *       - in: query

 *         name: permanent

 *         schema: { type: string, enum: ['true', 'false'], default: 'false' }

 *         description: If true, permanently deletes the row; otherwise sets is_active false

 *     responses:

 *       200:

 *         description: OK

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiSuccessMessage'

 *       404:

 *         description: Not found

 */

router.delete('/users/:id', userValidation.idParam, async (req, res) => {

    try {

        const { permanent = false } = req.query;

        const result = await userService.deleteUser(req.params.id, permanent === 'true');

        res.json({

            success: true,

            message: result.message

        });

    } catch (error) {

        res.status(404).json({

            success: false,

            error: error.message

        });

    }

});



/**

 * @openapi

 * /api/users/users/{id}/restore:

 *   post:

 *     tags: [Users]

 *     summary: Restore deactivated user

 *     parameters:

 *       - in: path

 *         name: id

 *         required: true

 *         schema: { type: integer, minimum: 1 }

 *     responses:

 *       200:

 *         description: OK

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiSuccessMessage'

 *       404:

 *         description: Not found

 */

router.post('/users/:id/restore', userValidation.idParam, async (req, res) => {

    try {

        const result = await userService.restoreUser(req.params.id);

        res.json({

            success: true,

            message: result.message

        });

    } catch (error) {

        res.status(404).json({

            success: false,

            error: error.message

        });

    }

});



/**

 * @openapi

 * /api/users/users/{id}/change-password:

 *   post:

 *     tags: [Users]

 *     summary: Change password

 *     parameters:

 *       - in: path

 *         name: id

 *         required: true

 *         schema: { type: integer, minimum: 1 }

 *     requestBody:

 *       required: true

 *       content:

 *         application/json:

 *           schema:

 *             $ref: '#/components/schemas/ChangePasswordBody'

 *     responses:

 *       200:

 *         description: OK

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiSuccessMessage'

 *       400:

 *         description: Validation or wrong current password

 */

router.post('/users/:id/change-password', 

    userValidation.idParam, 

    userValidation.changePassword, 

    async (req, res) => {

        try {

            const result = await userService.changePassword(

                req.params.id, 

                req.body.oldPassword, 

                req.body.newPassword

            );

            res.json({

                success: true,

                message: result.message

            });

        } catch (error) {

            res.status(400).json({

                success: false,

                error: error.message

            });

        }

    }

);



/**

 * @openapi

 * /api/users/users/{id}/tier:

 *   patch:

 *     tags: [Users]

 *     summary: Update subscription tier

 *     parameters:

 *       - in: path

 *         name: id

 *         required: true

 *         schema: { type: integer, minimum: 1 }

 *     requestBody:

 *       required: true

 *       content:

 *         application/json:

 *           schema:

 *             $ref: '#/components/schemas/TierBody'

 *     responses:

 *       200:

 *         description: OK

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiSuccessUser'

 *       400:

 *         description: Invalid tier

 *       404:

 *         description: User not found

 */

router.patch('/users/:id/tier', userValidation.idParam, async (req, res) => {

    try {

        const { tierType } = req.body;

        if (!['basic', 'pro', 'extreme'].includes(tierType)) {

            return res.status(400).json({

                success: false,

                error: 'Invalid tier type. Must be basic, pro, or extreme'

            });

        }

        

        const user = await userService.updateTier(req.params.id, tierType);

        res.json({

            success: true,

            message: 'Tier updated successfully',

            data: user

        });

    } catch (error) {

        res.status(404).json({

            success: false,

            error: error.message

        });

    }

});



/**

 * @openapi

 * /api/users/users/stats/summary:

 *   get:

 *     tags: [Users]

 *     summary: User counts summary

 *     responses:

 *       200:

 *         description: OK

 *         content:

 *           application/json:

 *             schema:

 *               type: object

 *               properties:

 *                 success: { type: boolean, example: true }

 *                 data:

 *                   $ref: '#/components/schemas/UserStats'

 *       500:

 *         description: Server error

 */

router.get('/users/stats/summary', async (req, res) => {

    try {

        const stats = await userService.getUserStats();

        res.json({

            success: true,

            data: stats

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            error: error.message

        });

    }

});



/**

 * @openapi

 * /api/users/users/bulk-delete:

 *   post:

 *     tags: [Users]

 *     summary: Deactivate multiple users

 *     requestBody:

 *       required: true

 *       content:

 *         application/json:

 *           schema:

 *             $ref: '#/components/schemas/BulkDeleteBody'

 *     responses:

 *       200:

 *         description: OK

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiSuccessMessage'

 *       400:

 *         description: Missing userIds

 *       500:

 *         description: Server error

 */

router.post('/users/bulk-delete', async (req, res) => {

    try {

        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds)) {

            return res.status(400).json({

                success: false,

                error: 'userIds array is required'

            });

        }

        

        const results = await Promise.all(

            userIds.map(id => userService.deleteUser(id, false))

        );

        

        res.json({

            success: true,

            message: `${results.length} users deactivated successfully`

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            error: error.message

        });

    }

});



/**

 * @openapi

 * /api/users/users/search/{query}:

 *   get:

 *     tags: [Users]

 *     summary: Search users by username or email

 *     parameters:

 *       - in: path

 *         name: query

 *         required: true

 *         schema: { type: string }

 *     responses:

 *       200:

 *         description: First page of matches (limit 20)

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiSuccessUsersList'

 *       500:

 *         description: Server error

 */

router.get('/users/search/:query', async (req, res) => {

    try {

        const { query } = req.params;

        const result = await userService.getAllUsers(1, 20, { search: query });

        res.json({

            success: true,

            data: result

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            error: error.message

        });

    }

});



export default router;

