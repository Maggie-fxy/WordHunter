import { createClient } from './client';
import { UserStats, WordRecord, CollectedImage } from './types';

const supabase = createClient();

// ============ User Stats ============

export async function getUserStats(userId: string): Promise<UserStats | null> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error('获取用户统计失败:', error);
    return null;
  }
  return data;
}

export async function updateUserStats(
  userId: string,
  updates: Partial<Pick<UserStats, 'diamonds' | 'total_collected' | 'total_mastered'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('user_stats')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  
  if (error) {
    console.error('更新用户统计失败:', error);
    return false;
  }
  return true;
}

export async function incrementDiamonds(userId: string, amount: number = 1): Promise<boolean> {
  const { data: current } = await supabase
    .from('user_stats')
    .select('diamonds')
    .eq('user_id', userId)
    .single();
  
  if (!current) return false;
  
  return updateUserStats(userId, { diamonds: current.diamonds + amount });
}

export async function incrementTotalCollected(userId: string, amount: number = 1): Promise<boolean> {
  const { data: current } = await supabase
    .from('user_stats')
    .select('total_collected')
    .eq('user_id', userId)
    .single();
  
  if (!current) return false;
  
  return updateUserStats(userId, { total_collected: current.total_collected + amount });
}

// ============ Word Records ============

export async function getWordRecords(userId: string): Promise<WordRecord[]> {
  const { data, error } = await supabase
    .from('word_records')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error('获取单词记录失败:', error);
    return [];
  }
  return data || [];
}

export async function getWordRecord(userId: string, wordId: string): Promise<WordRecord | null> {
  const { data, error } = await supabase
    .from('word_records')
    .select('*')
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('获取单词记录失败:', error);
  }
  return data;
}

export async function upsertWordRecord(
  userId: string,
  wordId: string,
  updates: Partial<Pick<WordRecord, 'choice_correct' | 'spelling_correct' | 'mastered' | 'last_review_at'>>
): Promise<WordRecord | null> {
  // 先尝试获取现有记录
  const existing = await getWordRecord(userId, wordId);
  
  if (existing) {
    // 更新现有记录
    const { data, error } = await supabase
      .from('word_records')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) {
      console.error('更新单词记录失败:', error);
      return null;
    }
    return data;
  } else {
    // 创建新记录
    const { data, error } = await supabase
      .from('word_records')
      .insert({
        user_id: userId,
        word_id: wordId,
        choice_correct: updates.choice_correct || 0,
        spelling_correct: updates.spelling_correct || 0,
        mastered: updates.mastered || false,
        last_review_at: updates.last_review_at || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('创建单词记录失败:', error);
      return null;
    }
    return data;
  }
}

// ============ Collected Images ============

export async function getCollectedImages(userId: string, wordId?: string): Promise<CollectedImage[]> {
  let query = supabase
    .from('collected_images')
    .select('*')
    .eq('user_id', userId);
  
  if (wordId) {
    query = query.eq('word_id', wordId);
  }
  
  const { data, error } = await query.order('captured_at', { ascending: false });
  
  if (error) {
    console.error('获取收集图片失败:', error);
    return [];
  }
  return data || [];
}

export async function addCollectedImage(
  userId: string,
  wordRecordId: string,
  wordId: string,
  imageUrl: string,
  detectedObject: string
): Promise<CollectedImage | null> {
  const { data, error } = await supabase
    .from('collected_images')
    .insert({
      user_id: userId,
      word_record_id: wordRecordId,
      word_id: wordId,
      image_url: imageUrl,
      detected_object: detectedObject,
    })
    .select()
    .single();
  
  if (error) {
    console.error('添加收集图片失败:', error);
    return null;
  }
  return data;
}

export async function deleteCollectedImage(imageId: string): Promise<boolean> {
  const { error } = await supabase
    .from('collected_images')
    .delete()
    .eq('id', imageId);
  
  if (error) {
    console.error('删除收集图片失败:', error);
    return false;
  }
  return true;
}

// ============ 综合操作 ============

// 收集成功后的完整操作：创建/更新单词记录 + 添加图片 + 更新统计
export async function handleCollectionSuccess(
  userId: string,
  wordId: string,
  imageUrl: string,
  detectedObject: string
): Promise<{ success: boolean; wordRecord?: WordRecord; image?: CollectedImage }> {
  try {
    // 1. 创建或获取单词记录
    let wordRecord = await getWordRecord(userId, wordId);
    if (!wordRecord) {
      wordRecord = await upsertWordRecord(userId, wordId, {});
    }
    
    if (!wordRecord) {
      return { success: false };
    }
    
    // 2. 添加收集的图片
    const image = await addCollectedImage(
      userId,
      wordRecord.id,
      wordId,
      imageUrl,
      detectedObject
    );
    
    if (!image) {
      return { success: false };
    }
    
    // 3. 更新用户统计（钻石+1，总收集+1）
    const { data: stats } = await supabase
      .from('user_stats')
      .select('diamonds, total_collected')
      .eq('user_id', userId)
      .single();
    
    if (stats) {
      await updateUserStats(userId, {
        diamonds: stats.diamonds + 1,
        total_collected: stats.total_collected + 1,
      });
    }
    
    return { success: true, wordRecord, image };
  } catch (error) {
    console.error('收集操作失败:', error);
    return { success: false };
  }
}

// 获取用户的完整学习数据
export async function getUserLearningData(userId: string) {
  const [stats, wordRecords, images] = await Promise.all([
    getUserStats(userId),
    getWordRecords(userId),
    getCollectedImages(userId),
  ]);
  
  // 将数据转换为前端需要的格式
  const wordRecordsMap: Record<string, {
    wordId: string;
    images: Array<{ url: string; capturedAt: Date; detectedObject: string; wordId: string }>;
    choiceCorrect: number;
    spellingCorrect: number;
    mastered: boolean;
    lastReviewAt?: Date;
  }> = {};
  
  for (const record of wordRecords) {
    const recordImages = images.filter(img => img.word_id === record.word_id);
    wordRecordsMap[record.word_id] = {
      wordId: record.word_id,
      images: recordImages.map(img => ({
        url: img.image_url,
        capturedAt: new Date(img.captured_at),
        detectedObject: img.detected_object,
        wordId: img.word_id,
      })),
      choiceCorrect: record.choice_correct,
      spellingCorrect: record.spelling_correct,
      mastered: record.mastered,
      lastReviewAt: record.last_review_at ? new Date(record.last_review_at) : undefined,
    };
  }
  
  return {
    diamonds: stats?.diamonds || 0,
    totalCollected: stats?.total_collected || 0,
    wordRecords: wordRecordsMap,
  };
}
