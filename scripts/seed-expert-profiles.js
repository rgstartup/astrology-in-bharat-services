"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
var dotenv = require("dotenv");
var typeorm_1 = require("typeorm");
var user_entity_1 = require("../src/users/entities/user.entity");
var roles_entity_1 = require("../src/role/entities/roles.entity");
var profile_client_entity_1 = require("../src/client/profile/entities/profile-client.entity");
var profile_expert_entity_1 = require("../src/expert/profile/entities/profile-expert.entity");
var address_entity_1 = require("../src/common/entities/address.entity");
var oauth_accounts_entity_1 = require("../src/auth/entities/oauth-accounts.entity");
var credential_entity_1 = require("../src/auth/entities/credential.entity");
var used_tokens_entity_1 = require("../src/auth/entities/used-tokens.entity");
// Load environment variables
dotenv.config();
// Database configuration
var AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'astrology_bharat',
    ssl: process.env.DB_SSL !== 'false', // Enable SSL for Neon
    entities: [
        user_entity_1.User,
        roles_entity_1.Role,
        profile_client_entity_1.ProfileClient,
        profile_expert_entity_1.ProfileExpert,
        address_entity_1.Address,
        oauth_accounts_entity_1.OAuthAccount,
        credential_entity_1.Credential,
        used_tokens_entity_1.UsedTokens,
    ],
    synchronize: false,
    logging: true,
});
var specializations = [
    'Vedic Astrology',
    'Western Astrology',
    'Numerology',
    'Tarot Reading',
    'Palmistry',
    'Horoscope Reading',
    'Birth Chart Analysis',
    'Zodiac Compatibility',
    'Astrocartography',
    'Lunar Node Analysis',
    'Remedial Astrology',
    'Medical Astrology',
    'Vastu Shastra',
    'Feng Shui',
    'Chakra Healing',
    'Crystal Therapy',
    'Karmic Astrology',
    'Predictive Astrology',
];
var locations = [
    { city: 'Delhi', state: 'Delhi', zipCode: '110001' },
    { city: 'Mumbai', state: 'Maharashtra', zipCode: '400001' },
    { city: 'Bangalore', state: 'Karnataka', zipCode: '560001' },
    { city: 'Pune', state: 'Maharashtra', zipCode: '411001' },
    { city: 'Chennai', state: 'Tamil Nadu', zipCode: '600001' },
    { city: 'Hyderabad', state: 'Telangana', zipCode: '500001' },
    { city: 'Kolkata', state: 'West Bengal', zipCode: '700001' },
    { city: 'Jaipur', state: 'Rajasthan', zipCode: '302001' },
];
var genders = ['male', 'female', 'other'];
function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomRating() {
    return parseFloat((Math.random() * 5).toFixed(1));
}
var languagesPool = [
    'Hindi',
    'English',
    'Bengali',
    'Tamil',
    'Telugu',
    'Marathi',
    'Gujarati',
    'Kannada',
    'Malayalam',
    'Punjabi',
];
function getRandomLanguages() {
    var count = getRandomNumber(1, 3);
    var chosen = [];
    while (chosen.length < count) {
        var lang = getRandomItem(languagesPool);
        if (!chosen.includes(lang))
            chosen.push(lang);
    }
    return chosen;
}
function getRandomPrice(min, max) {
    if (min === void 0) { min = 100; }
    if (max === void 0) { max = 2000; }
    // Price in rupees (or your app currency); integer
    return getRandomNumber(min, max);
}
function seedExpertProfiles() {
    return __awaiter(this, void 0, void 0, function () {
        var userRepo, profileRepo, addressRepo, expertUsers, bioTemplates, _i, expertUsers_1, user, existingProfile, chosenLangs, profile, savedProfile, location_1, address, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, 10, 12]);
                    return [4 /*yield*/, AppDataSource.initialize()];
                case 1:
                    _a.sent();
                    console.log('Database connection established');
                    userRepo = AppDataSource.getRepository(user_entity_1.User);
                    profileRepo = AppDataSource.getRepository(profile_expert_entity_1.ProfileExpert);
                    addressRepo = AppDataSource.getRepository(address_entity_1.Address);
                    return [4 /*yield*/, userRepo
                            .createQueryBuilder('user')
                            .leftJoinAndSelect('user.roles', 'roles')
                            .where('roles.name = :roleName', { roleName: 'expert' })
                            .getMany()];
                case 2:
                    expertUsers = _a.sent();
                    console.log("Found ".concat(expertUsers.length, " expert users"));
                    bioTemplates = [
                        'Experienced astrologer with 10+ years of practice in vedic and western astrology.',
                        'Passionate about helping people understand their destiny through celestial guidance.',
                        'Specialized in birth chart analysis and personalized horoscope readings.',
                        'Expert in numerology and its application to life guidance and decision making.',
                        'Dedicated to providing accurate tarot readings and spiritual guidance.',
                        'Certified astrologer offering comprehensive astrological consultations.',
                        'Skilled in palmistry with deep understanding of life patterns.',
                        'Professional astrologer with expertise in multiple astrological traditions.',
                        'Specializing in Vedic astrology with focus on marriage and career predictions.',
                        'Expert in lunar cycles and their impact on daily life.',
                        'Vastu consultant helping families create harmonious living spaces.',
                        'Master of Tarot with 15+ years of reading experience.',
                        'Birth chart specialist providing detailed personality and career insights.',
                        'Zodiac compatibility expert for couples and relationship guidance.',
                        'Remedial astrology practitioner offering solutions to life challenges.',
                        'Chakra healing specialist combining astrology with energy work.',
                        'Karmic astrology expert helping understand past life connections.',
                        'Predictive astrology specialist for major life events and timing.',
                    ];
                    _i = 0, expertUsers_1 = expertUsers;
                    _a.label = 3;
                case 3:
                    if (!(_i < expertUsers_1.length)) return [3 /*break*/, 8];
                    user = expertUsers_1[_i];
                    return [4 /*yield*/, profileRepo.findOne({
                            where: { user: { id: user.id } },
                        })];
                case 4:
                    existingProfile = _a.sent();
                    if (existingProfile) {
                        console.log("\u2717 Profile already exists for user: ".concat(user.email));
                        return [3 /*break*/, 7];
                    }
                    chosenLangs = getRandomLanguages();
                    profile = profileRepo.create({
                        user: { id: user.id },
                        gender: getRandomItem(genders),
                        specialization: getRandomItem(specializations),
                        bio: getRandomItem(bioTemplates),
                        experience_in_years: getRandomNumber(1, 25),
                        rating: getRandomRating(),
                        // store as CSV to match existing entity column (text)
                        languages: chosenLangs.join(','),
                        // price between 1 and 100 as requested
                        price: getRandomPrice(1, 100),
                    });
                    return [4 /*yield*/, profileRepo.save(profile)];
                case 5:
                    savedProfile = _a.sent();
                    location_1 = getRandomItem(locations);
                    address = addressRepo.create({
                        line1: "".concat(getRandomNumber(1, 999), " ").concat(['MG Road', 'Park Street', 'Main Street', 'High Street', 'Central Avenue'][Math.floor(Math.random() * 5)]),
                        city: location_1.city,
                        state: location_1.state,
                        country: 'India',
                        zipCode: location_1.zipCode,
                        tag: address_entity_1.AddressTag.HOME,
                        profile_expert: { id: savedProfile.id },
                    });
                    return [4 /*yield*/, addressRepo.save(address)];
                case 6:
                    _a.sent();
                    console.log("\u2713 Created profile for ".concat(user.name, " (").concat(user.email, ") - Specialization: ").concat(profile.specialization, ", Experience: ").concat(profile.experience_in_years, " years, Rating: ").concat(profile.rating));
                    _a.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8:
                    console.log('✓ Expert profile seeding completed!');
                    return [3 /*break*/, 12];
                case 9:
                    error_1 = _a.sent();
                    console.error('Error seeding expert profiles:', error_1);
                    return [3 /*break*/, 12];
                case 10: return [4 /*yield*/, AppDataSource.destroy()];
                case 11:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/];
            }
        });
    });
}
seedExpertProfiles();
