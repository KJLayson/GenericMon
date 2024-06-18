export function setup(ctx)
{
	//Decimal form of the percent increase for each special pet unlocked in each category
	const relic_chance_perc = 0.025
	const relic_quant_perc = 0.025
	const rare_chance_perc = 0.01

	// This is required to be intialized at the very beginning for compatibility with other mods that patch PetManger.unlockPet()
	let special_pets = {
		relic_chance: 	{pets: ["genericmon:aviator", "genericmon:baby_bear"], num_unlocked: 0, modifier: 1.0, perc_inc: relic_chance_perc},
		relic_quantity:	{pets: ["genericmon:milton", "genericmon:bubbles"], num_unlocked: 0, modifier: 1.0, perc_inc: relic_quant_perc},
		rare_chance: 	{pets: ["genericmon:finvestigator", "genericmon:turtleneck"], num_unlocked: 0, modifier: 1.0, perc_inc: rare_chance_perc}
	}

	// Check for unlocked special pets and update custom modifiers accordingly.
	function checkPets(){
		for (const key of Object.keys(special_pets)){
			special_pets[key].num_unlocked = 0

			special_pets[key].pets.forEach((id)=>{
				let pet = game.pets.getObjectByID(id)
				if (game.petManager.isPetUnlocked(pet)){
						special_pets[key].num_unlocked += 1
					}
				})
				special_pets[key].modifier = 1.0 + (special_pets[key].num_unlocked * special_pets[key].perc_inc)
			}
		}

	// On load tally special pets
	ctx.onCharacterLoaded(async (ctx) => {
		
		checkPets()
		//unlockAll()
	});


	// Anytime a new pet is unlocked, perform a quick check to see if it is from this mod
	ctx.patch(PetManager, "unlockPet").after(function(o, pet) {
		// This causes compatability issues if special_pets is not initialized at the very beginning
		if 	(special_pets.relic_chance.pets.includes(pet.id) ||
		 	(special_pets.relic_quantity.pets.includes(pet.id)) ||
		  	(special_pets.rare_chance.pets.includes(pet.id)))
		{
			checkPets()
		}
	});

	// Replaces rollForRareDrops with custom modifiers for rare drop chances and quantities
	ctx.patch(Skill, "rollForRareDrops").replace(function(o, level, rewards, action) {
		this.rareDrops.forEach((drop)=>{
			// Creating copies that can be modified without overwriting values
			let chance_copy = JSON.parse(JSON.stringify(drop.chance))
			let quantity_copy = JSON.parse(JSON.stringify(drop.quantity))

			// Apply modifiers based on type of item
			if (drop.item.localID.includes('Lesser_Relic')) {
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