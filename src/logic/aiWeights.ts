/* aiWeights.ts
 * Evaluation weights for Casual and Grandmaster AI.
 */

export class AIWeights {
  private static instance: AIWeights | null = null;

  static defaultWeights(): AIWeights {
    if (!this.instance) {
      this.instance = new AIWeights();
    }
    return this.instance;
  }

  // Opponent Reply Score
  opp_reply_bear_off_bonus = 8000000.0;
  opp_reply_bear_off_progress_mult = 150000.0;
  opp_reply_progress_mult = 120000.0;
  opp_reply_move_from_head_bonus = 700000.0;
  opp_reply_move_into_home_bonus = 450000.0;
  opp_reply_target_stack1_bonus = 500000.0;
  opp_reply_target_stack2_bonus = 250000.0;
  opp_reply_target_stack4_plus_penalty = 500000.0;
  opp_reply_prime_inc_delta_mult = 900000.0;
  opp_reply_prime_inc_square_mult = 90000.0;
  opp_reply_prime5_plus_bonus = 1000000.0;
  opp_reply_occupied_inc_bonus = 700000.0;
  opp_reply_connectivity_mult = 100000.0;
  opp_reply_lets_trap_tail_penalty = 5000000.0;
  opp_reply_head_block_penalty = 350000.0;
  opp_reply_tail_distance_bonus_mult = 200000.0;

  // Future Flexibility Score
  flex_moves_count_mult = 45000.0;
  flex_blocked_rolls_penalty = 900000.0;

  // Endgame Turn Plan
  endgame_plan_entries_mult = 10000000.0;
  endgame_plan_outside_after_penalty = 1800000.0;
  endgame_plan_outside_pip_after_penalty = 450000.0;
  endgame_plan_total_pip_after_penalty = 35000.0;
  endgame_plan_home_depth_after_bonus = 12000.0;
  endgame_plan_home_only_moves_penalty = 2500000.0;

  // Bear-Off
  bear_off_all_in_home_bonus = 15000000.0;
  bear_off_combined_penalty = 500000.0;
  bear_off_dist_to_finish_mult = 100000.0;
  bear_off_point123_penalty_mult = 80000.0;
  bear_off_before_all_in_home_penalty = 10000000.0;

  // Endgame
  endgame_total_entries_mult = 7000000.0;
  endgame_no_entries_penalty = 3000000.0;
  endgame_combined_one_entry_penalty_mult = 4000000.0;
  endgame_move_inside_home_penalty = 7000000.0;
  endgame_move_min_idx_bonus = 6000000.0;
  endgame_move_min_idx_progress_mult = 350000.0;
  endgame_move_near_min_idx_bonus = 1000000.0;
  endgame_move_near_min_idx_progress_mult = 100000.0;
  endgame_move_far_from_min_idx_penalty_mult = 700000.0;
  endgame_move_to_home_bonus = 4500000.0;
  endgame_deep_home_bonus_mult = 600000.0;
  endgame_move_from_home_to_outside_penalty = 3000000.0;

  // Opening & Midgame (Head)
  head_move_bonus = 12000000.0;
  head_stack_count_mult = 2000000.0;
  head_target_stack1_bonus = 1000000.0;
  head_target_stack2_bonus = 600000.0;
  head_target_stack3_plus_penalty_mult = 50000.0;
  head_target_empty_bonus = 2500000.0;
  head_move_to_opponent_half_bonus = 200000.0;
  head_move_to_opp_half_near_head_bonus = 250000.0;
  head_move_to_our_half_bonus = 50000.0;
  not_moving_from_head_penalty_mult = 3000000.0;

  // Progress
  move_to_opp_half_first_time_bonus = 500000.0;
  checkers_on_opp_half_mult = 30000.0;
  move_to_opp_half_far_from_head_mult = 20000.0;
  midgame_progress_mult = 350000.0;

  // Occupying Points
  occupy_new_point_bonus_target = 3000000.0;
  occupy_new_point_bonus_no_target = 1500000.0;
  tower_penalty_finishing = 300000.0;
  tower_penalty_normal = 5000000.0;
  tower4_plus_penalty_mult = 15000000.0;
  connectivity_midgame_mult = 250000.0;

  // Primes
  prime_break5_plus_penalty = 55000000.0;
  prime_square_mult = 300000.0;
  prime_block_opp_head16_bonus = 1500000.0;
  prime_block_opp_head14_bonus = 500000.0;

  // Saving Tail
  not_saving_tail_penalty = 8000000.0;
  saving_tail_bonus = 4000000.0;
  saving_tail_progress_mult = 200000.0;

  // Penalties
  combined_move_penalty = 800000.0;
  all_in_home_move_inside_home_penalty = 2000000.0;
  midgame_move_inside_home_penalty = 4000000.0;
}
