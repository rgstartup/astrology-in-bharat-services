"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileExpert = void 0;
var typeorm_1 = require("typeorm");
var user_entity_1 = require("@/users/entities/user.entity");
var address_entity_1 = require("@/common/entities/address.entity");
var ProfileExpert = function () {
    var _classDecorators = [(0, typeorm_1.Entity)('profile_experts'), (0, typeorm_1.Check)("\"gender\" IN ('male', 'female', 'other')"), (0, typeorm_1.Check)("\"experience_in_years\" >= 0")];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _user_decorators;
    var _user_initializers = [];
    var _user_extraInitializers = [];
    var _gender_decorators;
    var _gender_initializers = [];
    var _gender_extraInitializers = [];
    var _specialization_decorators;
    var _specialization_initializers = [];
    var _specialization_extraInitializers = [];
    var _bio_decorators;
    var _bio_initializers = [];
    var _bio_extraInitializers = [];
    var _experience_in_years_decorators;
    var _experience_in_years_initializers = [];
    var _experience_in_years_extraInitializers = [];
    var _rating_decorators;
    var _rating_initializers = [];
    var _rating_extraInitializers = [];
    var _languages_decorators;
    var _languages_initializers = [];
    var _languages_extraInitializers = [];
    var _price_decorators;
    var _price_initializers = [];
    var _price_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var _updatedAt_decorators;
    var _updatedAt_initializers = [];
    var _updatedAt_extraInitializers = [];
    var _addresses_decorators;
    var _addresses_initializers = [];
    var _addresses_extraInitializers = [];
    var ProfileExpert = _classThis = /** @class */ (function () {
        function ProfileExpert_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.user = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _user_initializers, void 0));
            this.gender = (__runInitializers(this, _user_extraInitializers), __runInitializers(this, _gender_initializers, void 0));
            this.specialization = (__runInitializers(this, _gender_extraInitializers), __runInitializers(this, _specialization_initializers, void 0));
            this.bio = (__runInitializers(this, _specialization_extraInitializers), __runInitializers(this, _bio_initializers, void 0));
            this.experience_in_years = (__runInitializers(this, _bio_extraInitializers), __runInitializers(this, _experience_in_years_initializers, void 0));
            //   @Column({ type: 'decimal', nullable: true })
            //   hourlyRate?: number;
            this.rating = (__runInitializers(this, _experience_in_years_extraInitializers), __runInitializers(this, _rating_initializers, void 0));
            this.languages = (__runInitializers(this, _rating_extraInitializers), __runInitializers(this, _languages_initializers, void 0));
            this.price = (__runInitializers(this, _languages_extraInitializers), __runInitializers(this, _price_initializers, void 0));
            this.createdAt = (__runInitializers(this, _price_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            this.addresses = (__runInitializers(this, _updatedAt_extraInitializers), __runInitializers(this, _addresses_initializers, void 0));
            __runInitializers(this, _addresses_extraInitializers);
        }
        return ProfileExpert_1;
    }());
    __setFunctionName(_classThis, "ProfileExpert");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _user_decorators = [(0, typeorm_1.OneToOne)(function () { return user_entity_1.User; }, function (user) { return user.profile_expert; }), (0, typeorm_1.JoinColumn)()];
        _gender_decorators = [(0, typeorm_1.Column)({
                type: 'text',
            })];
        _specialization_decorators = [(0, typeorm_1.Column)({
                type: 'text',
            })];
        _bio_decorators = [(0, typeorm_1.Column)({ type: 'text', nullable: true })];
        _experience_in_years_decorators = [(0, typeorm_1.Column)({
                type: 'int',
                default: 0,
            })];
        _rating_decorators = [(0, typeorm_1.Column)({ type: 'float', default: 0 })];
        _languages_decorators = [(0, typeorm_1.Column)({ type: 'text', nullable: true })];
        _price_decorators = [(0, typeorm_1.Column)({ type: 'float', nullable: true })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        _addresses_decorators = [(0, typeorm_1.OneToMany)(function () { return address_entity_1.Address; }, function (address) { return address.profile_expert; }, {
                cascade: true,
                eager: true,
            })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: function (obj) { return "user" in obj; }, get: function (obj) { return obj.user; }, set: function (obj, value) { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _gender_decorators, { kind: "field", name: "gender", static: false, private: false, access: { has: function (obj) { return "gender" in obj; }, get: function (obj) { return obj.gender; }, set: function (obj, value) { obj.gender = value; } }, metadata: _metadata }, _gender_initializers, _gender_extraInitializers);
        __esDecorate(null, null, _specialization_decorators, { kind: "field", name: "specialization", static: false, private: false, access: { has: function (obj) { return "specialization" in obj; }, get: function (obj) { return obj.specialization; }, set: function (obj, value) { obj.specialization = value; } }, metadata: _metadata }, _specialization_initializers, _specialization_extraInitializers);
        __esDecorate(null, null, _bio_decorators, { kind: "field", name: "bio", static: false, private: false, access: { has: function (obj) { return "bio" in obj; }, get: function (obj) { return obj.bio; }, set: function (obj, value) { obj.bio = value; } }, metadata: _metadata }, _bio_initializers, _bio_extraInitializers);
        __esDecorate(null, null, _experience_in_years_decorators, { kind: "field", name: "experience_in_years", static: false, private: false, access: { has: function (obj) { return "experience_in_years" in obj; }, get: function (obj) { return obj.experience_in_years; }, set: function (obj, value) { obj.experience_in_years = value; } }, metadata: _metadata }, _experience_in_years_initializers, _experience_in_years_extraInitializers);
        __esDecorate(null, null, _rating_decorators, { kind: "field", name: "rating", static: false, private: false, access: { has: function (obj) { return "rating" in obj; }, get: function (obj) { return obj.rating; }, set: function (obj, value) { obj.rating = value; } }, metadata: _metadata }, _rating_initializers, _rating_extraInitializers);
        __esDecorate(null, null, _languages_decorators, { kind: "field", name: "languages", static: false, private: false, access: { has: function (obj) { return "languages" in obj; }, get: function (obj) { return obj.languages; }, set: function (obj, value) { obj.languages = value; } }, metadata: _metadata }, _languages_initializers, _languages_extraInitializers);
        __esDecorate(null, null, _price_decorators, { kind: "field", name: "price", static: false, private: false, access: { has: function (obj) { return "price" in obj; }, get: function (obj) { return obj.price; }, set: function (obj, value) { obj.price = value; } }, metadata: _metadata }, _price_initializers, _price_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: function (obj) { return "updatedAt" in obj; }, get: function (obj) { return obj.updatedAt; }, set: function (obj, value) { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, null, _addresses_decorators, { kind: "field", name: "addresses", static: false, private: false, access: { has: function (obj) { return "addresses" in obj; }, get: function (obj) { return obj.addresses; }, set: function (obj, value) { obj.addresses = value; } }, metadata: _metadata }, _addresses_initializers, _addresses_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ProfileExpert = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ProfileExpert = _classThis;
}();
exports.ProfileExpert = ProfileExpert;
