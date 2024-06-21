export function setup(ctx) {
	//Percent increase for custom modifiers for each respecitve pet unlocked
	const mod_perc = {relic_chance: 0.025, relic_quantity: 0.025, rare_chance: 0.01 }
	let special_pets = {
		relic_chance: { pets: ["genericmon:aviator", "genericmon:baby_bear"], num_unlocked: 0, modifier: 1.0, perc_inc: mod_perc.relic_chance },
		relic_quantity: { pets: ["genericmon:milton", "genericmon:bubbles"], num_unlocked: 0, modifier: 1.0, perc_inc: mod_perc.relic_quantity },
		rare_chance: { pets: ["genericmon:finvestigator", "genericmon:turtleneck"], num_unlocked: 0, modifier: 1.0, perc_inc: mod_perc.rare_chance }
	}
	let all_special_pets_unlocked = false

	// Pet treat rates
	const pet_treat_perc = 0.1;
	const tier_chance = { freebie: 1, c: 0.1, b: 0.05, a: 0.025, s: 0.0125, ss: 0.00625, sss: 0.002 }
	const max_threshold = 1000
	const max_score = max_threshold / (1 - tier_chance.sss)
	let token_pets_locked = [
		{ pets: [], threshold: calculateThreshold(tier_chance.freebie), tier: 0, isEmpty: false },
		{ pets: [], threshold: calculateThreshold(tier_chance.c), tier: 1, isEmpty: false },
		{ pets: [], threshold: calculateThreshold(tier_chance.b), tier: 2, isEmpty: false },
		{ pets: [], threshold: calculateThreshold(tier_chance.a), tier: 3, isEmpty: false },
		{ pets: [], threshold: calculateThreshold(tier_chance.s), tier: 4, isEmpty: false },
		{ pets: [], threshold: calculateThreshold(tier_chance.ss), tier: 5, isEmpty: false },
		{ pets: ["genericmon:gachasaurGS3"], threshold: calculateThreshold(tier_chance.sss), tier: 6, isEmpty: false },
	]
	let all_token_pets_unlocked = false

	// On load determine unique pets already unlocked
	ctx.onCharacterLoaded(async (ctx) => {
		checkSpecialPets()
		checkTokenPets()
		//unlockAll()
	});

	// Check for unlocked special pets and update custom modifiers accordingly.
	function checkSpecialPets() {
		if (all_special_pets_unlocked === true) {
			return;
		}

		let unlocked_tally = 0
		for (const key of Object.keys(special_pets)) {
			special_pets[key].num_unlocked = 0

			special_pets[key].pets.forEach((id) => {
				let pet = game.pets.getObjectByID(id)
				if (game.petManager.isPetUnlocked(pet)) {
					special_pets[key].num_unlocked++
					unlocked_tally++
				}
			})
			special_pets[key].modifier = 1.0 + (special_pets[key].num_unlocked * special_pets[key].perc_inc)
		}
		all_special_pets_unlocked = (unlocked_tally === special_pets.relic_chance.pets.length + special_pets.relic_quantity.pets.length + special_pets.rare_chance.pets.length)
	}

	function checkTokenPets() {
		if (all_token_pets_unlocked === true) {
			return;
		}

		let tier = 0
		let max_tier = token_pets_locked.length
		let tiers_empty = 0
		while (tier < max_tier) {
			if ((token_pets_locked[tier].isEmpty === false) && (token_pets_locked[tier].pets.length === 0)) {
				token_pets_locked[tier].isEmpty = true
				tiers_empty++
			}
			tier++
		}

		if (tiers_empty === max_tier) {
			all_token_pets_unlocked = true
		}
	}

	function redeemPetToken(quantity) {
		let tokens_redeemed = 0
		while (tokens_redeemed < quantity) {
			if (all_special_pets_unlocked === true) {
				return;
			}

			let score = Math.random() * max_score
			let tier = getRollTier(score)
			let new_pet_unlocked = false
			while ((tier >= 0) && (new_pet_unlocked === false)) {
				if (token_pets_locked[tier].isEmpty === false) {
					if (token_pets_locked[tier].pets.length > 1) {
					token_pets_locked[tier].pets = shuffleTokenPets(tier)
					}
					let new_pet_id = token_pets_locked[tier].pets.pop()
					unlockTokenPetByID(new_pet_id)
					new_pet_unlocked = true
				}
				tier--
			}
			tokens_redeemed++
		}
	}

	function unlockTokenPetByID(pet_id) {
		game.petManager.unlockPetByID(pet_id);
		checkTokenPets()
	}

	function shuffleTokenPets(tier) {
		let pets = token_pets_locked[tier].pets
		for (let i = pets.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[pets[i], pets[j]] = [pets[j], pets[i]];
		}
		return pets;
	}

	function calculateThreshold(chance) {
		return max_score - (max_score * chance)
	}

	function getRollTier(score) {
		let roll_tier = 0
		if (score >= token_pets_locked[6].threshold) {
			roll_tier = 6
		} else if (score >= token_pets_locked[5].threshold) {
			roll_tier = 5
		} else if (score >= token_pets_locked[4].threshold) {
			roll_tier = 4
		} else if (score >= token_pets_locked[3].threshold) {
			roll_tier = 3
		} else if (score >= token_pets_locked[2].threshold) {
			roll_tier = 2
		} else if (score >= token_pets_locked[1].threshold) {
			roll_tier = 1
		} else {
			roll_tier = 0
		}
		return roll_tier
	}

	// Anytime a new pet is unlocked, perform a quick check to see if it is from this mod
	ctx.patch(PetManager, "unlockPet").after(function (o, pet) {
		if (all_special_pets_unlocked === true) {
			return;
		}
		if (special_pets.relic_chance.pets.includes(pet.id) ||
			(special_pets.relic_quantity.pets.includes(pet.id)) ||
			(special_pets.rare_chance.pets.includes(pet.id))) {
			checkSpecialPets()
		}
	});

	// Replaces rollForRareDrops with custom modifiers for rare drop chances and quantities
	ctx.patch(Skill, "rollForRareDrops").replace(function (o, level, rewards, action) {
		this.rareDrops.forEach((drop) => {
			// Creating copies that can be modified without overwriting values
			let chance_copy = JSON.parse(JSON.stringify(drop.chance))
			let quantity_copy = JSON.parse(JSON.stringify(drop.quantity))

			// Apply modifiers based on type of item
			if ((drop.item.localID.includes('Lesser_Relic')) || (drop.item.localID.includes('pet_token'))){
				chance_copy.chance *= special_pets.relic_chance.modifier * special_pets.rare_chance.modifier
				quantity_copy = Math.round(quantity_copy * special_pets.relic_quantity.modifier)
			} else if (chance_copy.type === "Fixed") {
				chance_copy.chance *= special_pets.rare_chance.modifier
			} else {
				chance_copy.scalingFactor *= special_pets.rare_chance.modifier
			}

			let realmToCheck = game.defaultRealm;
			if (action !== undefined)
				realmToCheck = action.realm;
			if (this.game.checkRequirements(drop.requirements) && this.isCorrectGamemodeForRareDrop(drop) && this.isCorrectRealmForRareDrop(drop, realmToCheck) && ((drop.item.localID.includes('Birthday_Present') && this.game.settings.toggleBirthdayEvent) || !drop.item.localID.includes('Birthday_Present')) && rollForOffItem(this.getRareDropChance(level, chance_copy))) {
				if (drop.altItem !== undefined && this.game.modifiers.allowSignetDrops) {
					rewards.addItem(drop.altItem, quantity_copy);
				} else {
					rewards.addItem(drop.item, quantity_copy);
				}
			}
		})
	});

	// If player has Pet Treat equipped, +1 roll for Genericmon skill pets with reduced chance.
	// This is the option chosen to mimic having bonus chance for pet rolls without replacing the function itself.
	ctx.patch(PetManager, 'rollForSkillPet').after(function (o, pet, actionInterval, forceSkill) {
		if ((this.unlocked.has(pet)) ||
			(pet.namespace !== "genericmon") ||
			(game.combat.player.equipment.equippedItems['melvorD:Consumable'].item.id !== "genericmon:pet_treat")) {
			return
		}
		if (forceSkill === undefined) {
			forceSkill = pet.skill
		}
		if (forceSkill === undefined) {
			return
		}

		const virtualLevel = forceSkill.virtualLevel;
		let chanceForPet = 0;

		chanceForPet = pet_treat_perc * ((actionInterval * virtualLevel) / 25000000) * (1 + this.game.modifiers.skillPetLocationChance / 100);
		if (rollPercentage(chanceForPet))
			this.unlockPet(pet);
	});



	ctx.patch(Bank, "processItemOpen").after(function (o, item, quantity) {
		if (item.id === "genericmon:pet_token") {
			redeemPetToken(quantity)
		}
	});








	/*
	************************
	** Dev Test Functions **
	************************
	*/

	// //Test function for skill pets
	// ctx.patch(PetManager, 'rollForSkillPet').after(function(o, pet, actionInterval, forceSkill) {
	// 	if (this.unlocked.has(pet))
	// 		return;
	// 	if (forceSkill === undefined)
	// 		forceSkill = pet.skill;
	// 	if (forceSkill === undefined)
	// 		return;

	// 	const virtualLevel = forceSkill.virtualLevel;
	// 	let chanceForPet = 0;

	// 	if (pet.id.includes("genericmon"))
	//         chanceForPet = 2

	//         if (rollPercentage(chanceForPet)) {
	//             this.unlockPet(pet);
	//         }
	// });

	// //Test unlock all
	// function unlockAll(){
	// 	game.pets.allObjects.forEach((pet)=> {
	// 		if (pet._namespace.name === "genericmon") {
	// 			game.petManager.unlockPetByID(pet.id)
	// 		}
	// 	})
	// }

};